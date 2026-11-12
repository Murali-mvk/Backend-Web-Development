# Express Session Authentication

A small Express 4 API demonstrating Prisma-backed user lookup, bcrypt password verification, signed HTTP-only cookies, and server-side sessions. Existing protected profile and post examples use the same authentication middleware.

## Prerequisites

- Node.js 18 or newer
- npm

## Install and configure

From this directory:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` before starting the server. `DATABASE_URL` defaults to a local SQLite database. Replace `COOKIE_SECRET` with a unique random value of at least 32 characters; generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not commit `.env` or use the example secret outside local development.

## Prisma database setup

The starter did not contain a Prisma schema or user model. This project adds a minimal SQLite `User` model with a unique email and a `passwordHash`; it does not store plaintext passwords.

```powershell
npm run db:generate
npm run db:push
```

SQLite's local schema is synchronized with `prisma db push`; no migration history existed in this starter.

Create or update a local account using a bcrypt-hashed password. Set these values only in your local shell:

```powershell
$env:SEED_USER_EMAIL = "sam@example.com"
$env:SEED_USER_PASSWORD = Read-Host "Choose a local test password"
npm run db:seed
Remove-Item Env:SEED_USER_EMAIL
Remove-Item Env:SEED_USER_PASSWORD
```

The seed command hashes the password with bcrypt before storing it. Re-running it updates the password for that email.

## Start the server

```powershell
npm start
```

The API listens on `http://localhost:5000` by default; set `PORT` in `.env` to change it. For development with automatic restarts, run `npm run dev`.

## Authentication endpoints

### `POST /auth/login`

Request:

```json
{
  "email": "sam@example.com",
  "password": "your local test password"
}
```

The email is trimmed and lowercased before lookup. Invalid input returns HTTP 400. Unknown email and incorrect password both return the same HTTP 401 response:

```json
{ "error": "Invalid email or password" }
```

Passwords must be between 1 and 72 UTF-8 bytes to avoid bcrypt's input truncation behavior.

Successful login returns HTTP 200 and sets the signed `sid` cookie:

```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "sam@example.com"
  }
}
```

### `GET /auth/me`

Send the login cookie. A valid session returns HTTP 200:

```json
{
  "user": {
    "id": "user_id",
    "email": "sam@example.com"
  }
}
```

Missing, invalid, expired, or orphaned sessions return HTTP 401:

```json
{ "error": "Unauthorized" }
```

### `POST /auth/logout`

Logout verifies the signed cookie, deletes its server-side session when present, and clears the cookie. It is idempotent and always returns HTTP 204.

The existing `GET /profile`, `GET /posts/my`, and `POST /posts` routes are also protected using the same session middleware.

## Cookie and session security

The `sid` cookie is signed using `COOKIE_SECRET` and configured with `HttpOnly`, `SameSite=Lax`, `Path=/`, and a 24-hour max age. In production, `Secure` is enabled; clients send Secure cookies only over HTTPS. Local HTTP development uses `Secure=false`.

The cookie contains only a random session identifier. Authentication checks its signature and resolves the identifier in a server-side store before loading the user from Prisma. Passwords are checked with asynchronous `bcrypt.compare`; public responses never include password hashes.

The session store is an in-memory `Map`, suitable only for learning and a single local process. Sessions disappear on restart and are not shared across instances. Production deployments should use a shared, persistent, expiring store such as Redis.

## Verify with curl

After creating a seeded account, save the login cookie to a cookie jar:

```powershell
curl.exe -i -c cookies.txt -X POST http://localhost:5000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"sam@example.com","password":"your local test password"}'
```

Use the cookie jar for the protected identity endpoint:

```powershell
curl.exe -i -b cookies.txt http://localhost:5000/auth/me
```

Logout clears the cookie and invalidates the server-side session:

```powershell
curl.exe -i -b cookies.txt -c cookies.txt -X POST http://localhost:5000/auth/logout
```

Calling `/auth/me` again with the old cookie returns HTTP 401. In Postman, send the login request first and allow its cookie jar to retain `sid`; then call `/auth/me` and `/auth/logout` on the same host.

## Tests

```powershell
npm test
```

The integration test creates a unique temporary SQLite database and exercises login success and failures, cookie attributes and signing, protected identity and existing routes, missing/tampered/expired sessions, logout invalidation, repeated logout, and the production `Secure` cookie flag. It removes its temporary database when complete.
