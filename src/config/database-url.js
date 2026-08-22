export function buildDatabaseUrl({ host, port, user, password, database }) {
  const credentials = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;

  return `postgresql://${credentials}@${host}:${port}/${encodeURIComponent(database)}`;
}
