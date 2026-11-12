const { COOKIE_NAME } = require('../config/cookie.config');
const userRepository = require('../repositories/user.repository');
const sessionStore = require('../services/session.store');

module.exports = async function requireAuth(req, res, next) {
  const sessionId = req.signedCookies[COOKIE_NAME];
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await userRepository.findUserById(session.userId);
    if (!user) {
      sessionStore.deleteSession(sessionId);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = { ...user, sub: user.id };
    return next();
  } catch (error) {
    return next(error);
  }
};
