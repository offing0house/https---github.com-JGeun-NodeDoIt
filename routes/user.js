const express = require('express');

const {isLoggedIn} = require('./middlewares');
const User = require('../models/user');
const Post = require("../models/post");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const router = express.Router();

/**
 * 프로필 상세보기
 * id: User의 PK
 */
router.get('/:id', async (req, res, next) => {
    const userId = req.params.id;
    try {
        const userInfo = await User.findOne({
            where: {
                id: userId,
                deletedAt: null
            },
            include: [{
                model: User,
                attributes: ["id", "nick"],
                as: "Followers"
            }, {
                model: User,
                attributes: ["id", "nick"],
                as: "Followings"
            }]
        });

        if (!userInfo) {
            res.status(404).send("no user");
        }

        const posts = await Post.findAll({
            where: {UserId: req.params.id}
        });

        res.json({
            userInfo,
            twits: posts
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
})

router.post('/:id/follow', isLoggedIn, async (req, res, next) => {
    try {
        const user = await User.findOne({where: {id: req.user.id}});
        if (user) {
            await user.addFollowing(parseInt(req.params.id, 10));
            res.send('success');
        } else {
            res.status(404).send('no user');
        }
    } catch (error) {
        console.error(error);
        next(error);
    }
});

try {
    fs.readdirSync('uploads');
} catch (error) {
    console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('uploads');
}

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename(req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
        },
    }),
    limits: {fileSize: 5 * 1024 * 1024},
});

/**
 * 프로필 이미지 업로드하기
 * /post/img랑 같은 방법으로 하면 된다.
 */

router.post("/:id/profileImage", isLoggedIn, upload.single('img'), async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(400).send("no user");
        }

        const profileImageUrl = `/img/${req.file.filename}`
        await User.update({
            img: profileImageUrl
        }, {
            where: {
                id: req.params.id
            }
        })

        res.json({
            url: profileImageUrl
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
});

module.exports = router;
