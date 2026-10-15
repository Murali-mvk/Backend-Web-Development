
const repo = require('./../repository/postsRepo');
const AppError = require('./../utils/AppError');

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

exports.getAll = async () => {
  return repo.findAll();
};

exports.create = async ({ authorId, title, body }) => {
  return repo.insert({ authorId, title, body });
};

/**
 * Edit a post with domain validation.
 * 1. Post must exist.
 * 2. Only the author can edit.
 * 3. Post must be within the 24-hour editing window.
 */
exports.editPost = async (postId, userId, changes) => {
  // Check 1: Post must exist
  const post = await repo.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // Check 2: Only the author may edit
  if (post.authorId !== userId) {
    throw new AppError(
      'You can only edit your own post',
      403
    );
  }

  // Check 3: Editing must happen within 24 hours
  const createdAt = new Date(post.createdAt).getTime();

  if (Date.now() - createdAt > EDIT_WINDOW_MS) {
    throw new AppError(
      'Post can no longer be edited',
      403
    );
  }

  // All checks passed: update the post
  return repo.update(postId, changes);
};
