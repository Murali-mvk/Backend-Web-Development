const store = require('../data/postStore');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePositiveInteger(value, name, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    const error = new Error(`${name} must be a positive integer`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function listPosts(query = {}) {
  const page = parsePositiveInteger(query.page, 'page', DEFAULT_PAGE);
  const requestedLimit = parsePositiveInteger(query.limit, 'limit', DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const posts = store.getAllPosts();
  const total = posts.length;
  const offset = (page - 1) * limit;

  return {
    data: posts.slice(offset, offset + limit),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrevious: page > 1
    }
  };
}

function getPost(id) {
  return store.getPostById(id);
}

function createPost(body = {}) {
  return store.createPost({
    title: body.title,
    author: body.author
  });
}

function likePost(id) {
  return store.incrementLikes(id);
}

function explode() {
  const err = new Error('SQLITE_CONSTRAINT in posts table');
  err.statusCode = 500;
  throw err;
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
