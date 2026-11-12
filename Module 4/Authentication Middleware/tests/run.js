require('dotenv').config();

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const testDatabase = `test-${process.pid}.db`;
const testDatabasePath = path.join(projectRoot, 'prisma', testDatabase);

process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-only-cookie-secret-at-least-32-characters';
process.env.DATABASE_URL = `file:./${testDatabase}`;

const prismaCli = require.resolve('prisma/build/index.js');
const databaseSetup = spawnSync(
  process.execPath,
  [prismaCli, 'db', 'push', '--force-reset', '--schema', 'prisma/schema.prisma'],
  { cwd: projectRoot, encoding: 'utf8', env: process.env }
);

if (databaseSetup.status !== 0) {
  throw new Error(`Test database setup failed:\n${databaseSetup.stdout}\n${databaseSetup.stderr}`);
}

const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');
const sessionStore = require('../src/services/session.store');
const { SESSION_TTL_MS } = require('../src/config/cookie.config');
const app = require('../src/app');

function request(server, { path: requestPath, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: requestPath,
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsedBody = data;
          try {
            parsedBody = data ? JSON.parse(data) : null;
          } catch {}
          resolve({ status: res.statusCode, body: parsedBody, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getSessionId(cookiePair) {
  const signedValue = decodeURIComponent(cookiePair.slice(cookiePair.indexOf('=') + 1));
  assert.ok(signedValue.startsWith('s:'));
  return signedValue.slice(2, signedValue.lastIndexOf('.'));
}

async function runTests() {
  const password = 'correct horse battery staple';
  const passwordHash = await bcrypt.hash(password, 4);
  const user = await prisma.user.create({
    data: { email: 'sam@example.com', passwordHash },
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  let passed = 0;
  let failed = 0;
  function check(condition, message) {
    if (condition) {
      console.log(`  PASS ${message}`);
      passed++;
    } else {
      console.error(`  FAIL ${message}`);
      failed++;
    }
  }

  try {
    console.log('\nSession authentication integration tests\n');

    const login = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: '  Sam@Example.com ', password },
    });
    const setCookie = login.headers['set-cookie']?.[0] || '';
    const cookiePair = setCookie.split(';')[0];
    check(login.status === 200, 'Valid login returns HTTP 200');
    check(cookiePair.startsWith('sid='), 'Login sets the sid cookie');
    check(/;\s*HttpOnly/i.test(setCookie), 'Session cookie is HttpOnly');
    check(/;\s*SameSite=Lax/i.test(setCookie), 'Session cookie uses SameSite=Lax');
    check(/;\s*Path=\//i.test(setCookie), 'Session cookie uses path /');
    check(!/;\s*Secure/i.test(setCookie), 'Development cookie allows local HTTP');
    check(/Max-Age=86400/i.test(setCookie), 'Session cookie expires after 24 hours');
    check(
      login.body?.user?.email === 'sam@example.com' &&
        login.body?.user?.id === user.id &&
        !('password' in login.body) &&
        !('passwordHash' in login.body?.user),
      'Login returns normalized safe identity only'
    );
    check(
      !decodeURIComponent(cookiePair).includes(user.id) &&
        !decodeURIComponent(cookiePair).includes(password),
      'Session cookie contains neither user identity nor credentials'
    );

    const wrongPassword = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'sam@example.com', password: 'wrong password' },
    });
    const unknownEmail = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'unknown@example.com', password },
    });
    check(
      wrongPassword.status === 401 &&
        JSON.stringify(wrongPassword.body) ===
          JSON.stringify({ error: 'Invalid email or password' }),
      'Incorrect password returns the generic 401 response'
    );
    check(
      unknownEmail.status === 401 &&
        JSON.stringify(unknownEmail.body) === JSON.stringify(wrongPassword.body),
      'Unknown email returns the identical generic 401 response'
    );

    const invalidInput = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'not-an-email', password },
    });
    check(invalidInput.status === 400, 'Malformed login input is rejected');
    const longPassword = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'sam@example.com', password: 'a'.repeat(73) },
    });
    check(longPassword.status === 400, 'Passwords beyond bcrypt input length are rejected');

    const validIdentity = await request(server, {
      path: '/auth/me',
      headers: { Cookie: cookiePair },
    });
    check(
      validIdentity.status === 200 &&
        JSON.stringify(validIdentity.body) ===
          JSON.stringify({ user: { id: user.id, email: 'sam@example.com' } }),
      'Valid signed cookie resolves server-side session and safe user'
    );

    const profile = await request(server, {
      path: '/profile',
      headers: { Cookie: cookiePair },
    });
    const posts = await request(server, {
      path: '/posts/my',
      headers: { Cookie: cookiePair },
    });
    const createPost = await request(server, {
      path: '/posts',
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    check(profile.status === 200, 'Existing protected profile route remains available');
    check(posts.status === 200 && createPost.status === 201, 'Existing post routes remain available');

    const missingCookie = await request(server, { path: '/auth/me' });
    const alteredCookie = await request(server, {
      path: '/auth/me',
      headers: { Cookie: 'sid=s%3Ainvalid-signature' },
    });
    check(
      missingCookie.status === 401 &&
        JSON.stringify(missingCookie.body) === JSON.stringify({ error: 'Unauthorized' }),
      'Missing cookie is rejected'
    );
    check(alteredCookie.status === 401, 'Altered signed cookie is rejected');

    const sessionId = getSessionId(cookiePair);
    const logout = await request(server, {
      path: '/auth/logout',
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    const clearedCookie = logout.headers['set-cookie']?.[0] || '';
    check(logout.status === 204, 'Logout returns HTTP 204');
    check(
      clearedCookie.startsWith('sid=') &&
        /;\s*HttpOnly/i.test(clearedCookie) &&
        /;\s*SameSite=Lax/i.test(clearedCookie) &&
        /;\s*Path=\//i.test(clearedCookie) &&
        /Expires=Thu, 01 Jan 1970/i.test(clearedCookie),
      'Logout clears sid with matching cookie attributes'
    );
    check(sessionStore.getSession(sessionId) === null, 'Logout deletes the server-side session');

    const reusedCookie = await request(server, {
      path: '/auth/me',
      headers: { Cookie: cookiePair },
    });
    const repeatedLogout = await request(server, {
      path: '/auth/logout',
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    check(reusedCookie.status === 401, 'Logged-out cookie cannot be reused');
    check(repeatedLogout.status === 204, 'Repeated logout remains idempotent');

    const expiringLogin = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'sam@example.com', password },
    });
    const expiringCookie = expiringLogin.headers['set-cookie'][0].split(';')[0];
    const expiringSessionId = getSessionId(expiringCookie);
    const originalNow = Date.now;
    let expiredSession;
    try {
      Date.now = () => originalNow() + SESSION_TTL_MS + 1;
      expiredSession = await request(server, {
        path: '/auth/me',
        headers: { Cookie: expiringCookie },
      });
    } finally {
      Date.now = originalNow;
    }
    check(expiredSession.status === 401, 'Expired server-side session is rejected');
    check(sessionStore.getSession(expiringSessionId) === null, 'Expired session is removed from the store');

    const orphan = await prisma.user.create({
      data: {
        email: 'orphan@example.com',
        passwordHash: await bcrypt.hash(password, 4),
      },
    });
    const orphanLogin = await request(server, {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'orphan@example.com', password },
    });
    const orphanCookie = orphanLogin.headers['set-cookie'][0].split(';')[0];
    await prisma.user.delete({ where: { id: orphan.id } });
    const orphanIdentity = await request(server, {
      path: '/auth/me',
      headers: { Cookie: orphanCookie },
    });
    check(orphanIdentity.status === 401, 'Session for a deleted user is rejected');

    process.env.NODE_ENV = 'production';
    let productionLogin;
    let productionLogout;
    try {
      productionLogin = await request(server, {
        path: '/auth/login',
        method: 'POST',
        body: { email: 'sam@example.com', password },
      });
      productionLogout = await request(server, {
        path: '/auth/logout',
        method: 'POST',
        headers: { Cookie: productionLogin.headers['set-cookie'][0].split(';')[0] },
      });
    } finally {
      process.env.NODE_ENV = 'test';
    }
    check(
      /;\s*Secure/i.test(productionLogin.headers['set-cookie']?.[0] || ''),
      'Production login cookie includes Secure'
    );
    check(
      productionLogout.status === 204 &&
        /;\s*Secure/i.test(productionLogout.headers['set-cookie']?.[0] || ''),
      'Production logout clears Secure cookie and returns HTTP 204'
    );

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    if (fs.existsSync(testDatabasePath)) fs.unlinkSync(testDatabasePath);
  }
}

runTests().catch(async (error) => {
  console.error('Test runner failed:', error);
  await prisma.$disconnect();
  if (fs.existsSync(testDatabasePath)) fs.unlinkSync(testDatabasePath);
  process.exitCode = 1;
});
