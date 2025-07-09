const Database = require('better-sqlite3');
const db = new Database('mydb.sqlite');

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    info TEXT
  )
`).run();

try {
  db.prepare('ALTER TABLE users ADD COLUMN info TEXT').run();
} catch (err) {
  if (!err.message.includes('duplicate column name')) {
    throw err;
  }
}

module.exports = db;

