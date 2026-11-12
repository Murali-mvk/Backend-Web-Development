# Database Integration Assignment Starter

Replace the in-memory repository implementation with PostgreSQL through Prisma. The application keeps the existing async repository contract so services and controllers remain stable during the swap.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A running local PostgreSQL instance

## Setup

```bash
npm install
cp .env.example .env
```

Update `.env` with your local PostgreSQL credentials if needed. The default value is:

```env
DATABASE_URL="postgresql://USER@localhost:5432/community_platform?schema=public"
PORT=3000
```

## Database creation

Create the database before running Prisma migrations:

```bash
createdb community_platform
```

If your PostgreSQL setup uses a different username or port, adjust `DATABASE_URL` in `.env` accordingly.

## Prisma workflow

Generate the Prisma client and apply the initial migration:

```bash
npx prisma generate
npx prisma migrate dev --name init_community_platform
```

Seed the starter data:

```bash
npm run prisma:seed
```

## Run the API

```bash
npm start
```

## Inspect the database

```bash
npx prisma studio
```

## Safe reset

To reset the local database while preserving the schema history, run:

```bash
npx prisma migrate reset
```

This drops and recreates the database, then runs the migration history again.
