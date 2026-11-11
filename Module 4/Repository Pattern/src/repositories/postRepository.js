const posts = new Map([
  [1, { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 }],
  [2, { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 }],
]);

let nextId = 3;

function findAll() {
  return Array.from(posts.values());
}

function findById(id) {
  return posts.get(Number(id)) || null;
}

function create(fields) {
  while (posts.has(nextId)) nextId += 1;

  const record = { ...fields, id: nextId };
  posts.set(nextId, record);
  nextId += 1;
  return record;
}

function update(id, patch) {
  const key = Number(id);
  const record = posts.get(key);
  if (!record) return null;

  Object.assign(record, patch, { id: record.id });
  return record;
}

function remove(id) {
  return posts.delete(Number(id));
}

// A Prisma-backed version would replace Map reads and writes with queries such as
// findMany, findUnique, create, update, and delete. Prisma would generate IDs
// through the database/schema default (for example autoincrement or UUID). The
// five repository methods, their return contracts, and the service interfaces
// would remain unchanged, so services and controllers would not need to know
// that storage moved from a Map to a database.
module.exports = { findAll, findById, create, update, remove };
