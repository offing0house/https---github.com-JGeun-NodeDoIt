const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {Post, Hashtag, Comment} = require('../models');
const {isLoggedIn} = require('./middlewares');
const User = require("../models/user");
const Like = require("../models/like");

const router = express.Router();

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

router.post('/img', isLoggedIn, upload.single('img'), (req, res) => {
    console.log(req.file);
    res.json({url: `/img/${req.file.filename}`});
});

const upload2 = multer();
router.post('/', isLoggedIn, upload2.none(), async (req, res, next) => {
    try {
        console.log(req.user);

        const food = req.body.food;
        const foodTypes = ["양식", "중식", "한식","일식"]
        if (!!food && !foodTypes.includes(food)) {
            res.status(400).send(`${foodTypes.join(", ")}이 아닙니다.`);
        }

        const post = await Post.create({
            content: req.body.content,
            img: req.body.url,
            UserId: req.user.id,
            food: req.body.food
        });
        const hashtags = req.body.content.match(/#[^\s#]*/g);
        if (hashtags) {
            const result = await Promise.all(
                hashtags.map(tag => {
                    return Hashtag.findOrCreate({
                        where: {title: tag.slice(1).toLowerCase()},
                    })
                }),
            );
            await post.addHashtags(result.map(r => r[0]));
        }
        res.redirect('/');
    } catch (error) {
        console.error(error);
        next(error);
    }
});

/**
 * 게시글 상세보기 + 댓글 조회 + 좋아요 조회
 * id: Post의 pk
 */
router.get("/:id", async (req, res, next) => {
    const postId = req.params.id;
    try {
        const post = await Post.findByPk(postId);
        if (!post) {
            res.status(400).send("no post");
        }

        const comments = await Comment.findAll({
            where: {
                PostId: postId
            },
            include: {
                model: User
            }
        });

        const likes = await Like.findAll({
            where: {
                PostId: postId
            },
            include: {
                model: User
            }
        });

        const userId = (req.user || {}).id;
        const alreadyLikedPost = !!userId && likes.filter(like => (like.User || {}).id === userId);
        res.json({
            post,
            comments,
            likes,
            alreadyLikedPost
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
});

/**
 * 특정 게시글에 댓글 작성하기
 * id: Post의 PK
 * body: {
 *     content: String,
 * }
 */
router.post("/:id/comment", isLoggedIn, async (req, res, next) => {
    const postId = req.params.id;
    const {content} = req.body;

    if (!content) {
        res.status(400).send("invalid body");
    }

    const user = req.user;
    if (!user) {
        res.status(400).send("no user");
    }

    const comment = await Comment.create({
        content,
        UserId: user.id,
        PostId: postId
    });

    // res.json({comment});
    res.redirect('/');
});

/**
 * 게시글 좋아요
 * id: Post의 PK
 */
router.post("/:id/like", isLoggedIn, async (req, res, next) => {
    const postId = req.params.id;

    const user = req.user;
    if (!user) {
        res.status(400).send("no user");
    }

    const userId = user.id;
    const prevLike = await Like.findOne({
        where: {
            UserId: userId,
            PostId: postId
        }
    });

    if (!!prevLike) {
        res.status(400).send("already liked post");
    }

    const like = await Like.create({
        UserId: userId,
        PostId: postId
    });

    res.json({like});
});

/**
 * 게시글 좋아요 취소
 * id: Post의 PK
 */
router.post("/:id/like/undo", isLoggedIn, async (req, res, next) => {
    const postId = req.params.id;
    const user = req.user;

    if (!user) {
        res.status(400).send("no user");
    }

    const userId = user.id;
    const prevLike = await Like.findOne({
        where: {
            PostId: postId,
            UserId: userId
        }
    });

    if (!prevLike) {
        res.status(400).send("no like history");
    }

    await Like.destroy({where: {id: prevLike.id}});

    res.status(200).send("success");
});

module.exports = router;
