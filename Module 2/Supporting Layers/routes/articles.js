const express = require('express');
const router = express.Router();
const ctrl = require('./../controllers/articlesController');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../utils/validateRequest');
const { createArticle, updateArticle } = require('../validators/article.validator');

router.get('/', asyncHandler(ctrl.list));

router.post('/', createArticle, validateRequest, asyncHandler(ctrl.create));
router.patch('/:id', updateArticle, validateRequest, asyncHandler(ctrl.update));

module.exports = router;
