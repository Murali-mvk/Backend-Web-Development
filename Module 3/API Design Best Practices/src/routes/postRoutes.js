const express = require('express');
const controller = require('../controllers/postController');

const router = express.Router();

router.get('/', controller.listPosts);
router.get('/:id', controller.getPost);
router.post('/', controller.createPost);
router.post('/:id/likes', controller.likePost);

module.exports = router;
