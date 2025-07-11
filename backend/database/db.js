const Database = require('better-sqlite3');
const db = new Database('mydb.sqlite');
db.prepare('DROP TABLE IF EXISTS users').run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    info TEXT,
    email TEXT UNIQUE,
    password TEXT UNIQUE
  )
`).run();

try {
  db.prepare('ALTER TABLE users ADD COLUMN email TEXT UNIQUE').run();
} catch (err) {
  if (!err.message.includes('duplicate column name')) {
    throw err;
  }
}

module.exports = db;

