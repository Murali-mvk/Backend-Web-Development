const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const {
  COOKIE_NAME,
  SESSION_TTL_MS,
  getClearCookieOptions,
  getCookieOptions,
} = require('../config/cookie.config');
const userRepository = require('../repositories/user.repository');
const sessionStore = require('../services/session.store');

const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5zvJz7g3y.f8pQ8Se9z2dZ8VD1L7E9K';

function isValidLoginInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (typeof body.email !== 'string' || typeof body.password !== 'string') return false;

  const email = body.email.trim();
  return (
    email.length > 0 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    body.password.length > 0 &&
    Buffer.byteLength(body.password, 'utf8') <= 72
  );
}

async function login(req, res, next) {
  if (!isValidLoginInput(req.body)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const email = req.body.email.trim().toLowerCase();
    const user = await userRepository.findUserByEmail(email);
    const matches = await bcrypt.compare(
      req.body.password,
      user ? user.passwordHash : DUMMY_PASSWORD_HASH
    );

    if (!user || !matches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionId = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    sessionStore.createSession(sessionId, user.id, expiresAt);
    res.cookie(COOKIE_NAME, sessionId, getCookieOptions());

    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  const sessionId = req.signedCookies[COOKIE_NAME];
  if (typeof sessionId === 'string') {
    sessionStore.deleteSession(sessionId);
  }

  res.clearCookie(COOKIE_NAME, getClearCookieOptions());
  return res.status(204).end();
}

module.exports = { login, logout };
