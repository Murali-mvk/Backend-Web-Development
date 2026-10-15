const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return error.name === 'AbortError' ||
    error.statusCode === 429 ||
    (error.statusCode >= 500 && error.statusCode < 600) ||
    NETWORK_ERROR_CODES.has(error.code);
}

async function withTimeout(operation, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withRetry(operation, options = {}) {
  let lastError;
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) {
        throw error;
      }
      if (attempt < maxAttempts - 1) {
        await sleep(baseDelayMs * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs === undefined ? 200 : options.timeoutMs;
  const maxAttempts = options.maxAttempts === undefined ? 3 : options.maxAttempts;
  const baseDelayMs = options.baseDelayMs === undefined ? 25 : options.baseDelayMs;

  try {
    const avatar = await withRetry(() => withTimeout(signal => avatarClient.getAvatar(authorId, { signal }), timeoutMs), { maxAttempts, baseDelayMs });
    return { authorId, avatar, degraded: false };
  } catch (error) {
    return { authorId, avatar: DEFAULT_AVATAR, degraded: true };
  }
}

module.exports = {
  DEFAULT_AVATAR,
  sleep,
  isRetryable,
  withTimeout,
  withRetry,
  getProfileWithAvatar,
};
