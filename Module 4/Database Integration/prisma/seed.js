const { PrismaClient } = require("@prisma/client");
const posts = require("../src/data/postSeed");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Seed User" },
  });

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {
        title: post.title,
        body: post.body,
        authorId: user.id,
      },
      create: {
        id: post.id,
        title: post.title,
        body: post.body,
        authorId: user.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
