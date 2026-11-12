const prisma = require('../config/prisma');

function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });
}

function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
}

module.exports = { findUserByEmail, findUserById };
