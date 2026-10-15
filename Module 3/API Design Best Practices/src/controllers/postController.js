const service = require('../services/postService');
const http = require('../utils/http');

function listPosts(req, res) {
  const result = service.listPosts(req.query);
  return http.sendList(res, result.data, result.meta);
}

function getPost(req, res) {
  const post = service.getPost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'Post not found');
  }
  return http.sendOk(res, post);
}

function createPost(req, res) {
  const post = service.createPost(req.body);
  return http.sendCreated(res, post);
}

function likePost(req, res) {
  const post = service.likePost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'Post not found');
  }
  return http.sendOk(res, post);
}

function explode(req, res) {
  service.explode();
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
