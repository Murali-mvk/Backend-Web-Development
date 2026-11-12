const prisma = require("../config/prisma");

function mapPrismaError(error, fallbackMessage, statusCode) {
  const mappedError = new Error(fallbackMessage);
  mappedError.code = error && error.code ? error.code : "UNKNOWN";
  mappedError.statusCode = statusCode;
  return mappedError;
}

async function findAll() {
  return prisma.post.findMany({
    orderBy: { id: "asc" },
  });
}

async function findById(id) {
  return prisma.post.findUnique({
    where: { id: Number(id) },
  });
}

async function create(fields = {}) {
  try {
    return await prisma.post.create({
      data: {
        title: fields.title,
        body: fields.body || "",
        authorId: Number(fields.authorId),
      },
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw mapPrismaError(error, "Author not found.", 400);
    }
    if (error.code === "P2002") {
      throw mapPrismaError(error, "A duplicate record already exists.", 409);
    }
    throw error;
  }
}

async function update(id, patch = {}) {
  try {
    const data = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.body !== undefined) data.body = patch.body;

    return await prisma.post.update({
      where: { id: Number(id) },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return null;
    }
    if (error.code === "P2003") {
      throw mapPrismaError(error, "Related record not found.", 400);
    }
    throw error;
  }
}

async function remove(id) {
  try {
    await prisma.post.delete({
      where: { id: Number(id) },
    });
    return true;
  } catch (error) {
    if (error.code === "P2025") {
      return false;
    }
    throw error;
  }
}

module.exports = { findAll, findById, create, update, remove };
