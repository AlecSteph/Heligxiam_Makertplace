/** Comptes client / démo en mémoire (clé = id_user UUID). */
const users = new Map();

function findMemoryUserByEmail(email) {
  const lower = String(email).trim().toLowerCase();
  for (const [, u] of users) {
    if (String(u.email).toLowerCase() === lower) return u;
  }
  return null;
}

function findMemoryUserById(id_user) {
  return users.get(id_user) || null;
}

function updateMemoryUserPassword(id_user, hashedPassword) {
  const u = users.get(id_user);
  if (!u) return false;
  u.password = hashedPassword;
  u.updated_at = new Date().toISOString();
  return true;
}

module.exports = {
  users,
  findMemoryUserByEmail,
  findMemoryUserById,
  updateMemoryUserPassword
};
