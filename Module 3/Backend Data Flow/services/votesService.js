const postsRepo = require('./../repository/postsRepo');
const votesRepo = require('./../repository/votesRepo');
const AppError = require('./../utils/AppError');

/**
 * Cast a vote, allowing only one vote per user per post.
 *
 * 1. The post must exist.
 * 2. The user must not have already voted.
 * 3. Insert the vote only if both checks pass.
 */
exports.castVote = async (postId, userId) => {
  // Check 1: Verify that the post exists
  const post = await postsRepo.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // Check 2: Verify that the user has not already voted
  const existingVote = await votesRepo.find(postId, userId);

  if (existingVote) {
    throw new AppError(
      'You have already voted on this post',
      409
    );
  }

  // Both checks passed: insert the vote
  return votesRepo.insert(postId, userId);
};

// Return the total number of votes for a post
exports.countFor = async (postId) => {
  return votesRepo.countByPost(postId);
};