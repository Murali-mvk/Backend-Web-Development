require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

async function main() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error(
      'Set a valid SEED_USER_EMAIL and a SEED_USER_PASSWORD of at most 72 UTF-8 bytes.'
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Seeded user ${email}`);
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
