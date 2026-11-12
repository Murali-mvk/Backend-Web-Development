const sessions = new Map();

function createSession(sessionId, userId, expiresAt) {
  sessions.set(sessionId, { userId, expiresAt: new Date(expiresAt) });
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { userId: session.userId, expiresAt: new Date(session.expiresAt) };
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { createSession, getSession, deleteSession };
