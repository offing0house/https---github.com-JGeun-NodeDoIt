const express = require('express');
const {isLoggedIn, isNotLoggedIn} = require('./middlewares');
const {Post, User, Hashtag,Comment} = require('../models');

const router = express.Router();

router.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.followerCount = req.user ? req.user.Followers.length : 0;
    res.locals.followingCount = req.user ? req.user.Followings.length : 0;
    res.locals.followerIdList = req.user ? req.user.Followings.map(f => f.id) : [];
    next();
});

router.get('/profile', async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['id', 'nick'],
            },
            order: [['createdAt', 'DESC']],
        });
       
        res.render('profile', {
            title: 'nodedoit',
            twits: posts,
           
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
    
});

router.get('/join', isNotLoggedIn, (req, res) => {
    res.render('join', {title: 'Join to - nodedoit'});
});

router.get('/', async (req, res, next) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['id', 'nick'],
            },
            order: [['createdAt', 'DESC']],
        });
        const users = await User.findAll({
           
            order: [['createdAt', 'DESC']],
        });
        const comments = await Comment.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.render('layout', {
            title: 'nodedoit',
            twits: posts,
            comments : comments,
            users:users,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});
router.get('/main', async (req, res, next) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['id', 'nick'],
            },
            order: [['createdAt', 'DESC']],
        });
        res.render('main', {
            title: 'nodedoit',
            twits: posts,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

/**
 * 게시글 해시테그 검색
 * food라는 키값 있으면 카테고리 내에서 검색
 */
router.get('/hashtag', async (req, res, next) => {
    const query = req.query.hashtag;
    const food = req.query.food;
    if (!query) {
        return res.redirect('/');
    }
    try {
        const hashtag = await Hashtag.findOne({where: {title: query}});
        let posts = [];
        if (hashtag) {
            posts = await hashtag.getPosts({
                ...!!food && {
                    where: {
                        food
                    }
                },
                include: [{model: User}]
            });
        }
        console.log(JSON.stringify(posts));

        return res.render('layout', {
            title: `${query} | NodeBird`,
            twits: posts,
        });
    } catch (error) {
        console.error(error);
        return next(error);
    }
});

module.exports = router;
