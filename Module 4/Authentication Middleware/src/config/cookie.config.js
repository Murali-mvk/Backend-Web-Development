const COOKIE_NAME = 'sid';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (
  !COOKIE_SECRET ||
  COOKIE_SECRET.length < 32 ||
  COOKIE_SECRET.startsWith('replace_with_')
) {
  throw new Error('Set COOKIE_SECRET to a random value of at least 32 characters.');
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
    signed: true,
  };
}

function getClearCookieOptions() {
  const options = getCookieOptions();
  delete options.maxAge;
  return options;
}

module.exports = {
  COOKIE_NAME,
  COOKIE_SECRET,
  SESSION_TTL_MS,
  getClearCookieOptions,
  getCookieOptions,
};
