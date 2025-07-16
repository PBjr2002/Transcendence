const Database = require('better-sqlite3');
const db = new Database('mydb.sqlite');
db.pragma('foreign_keys = ON');

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    info TEXT,
    email TEXT UNIQUE,
    password TEXT UNIQUE,
	online BOOL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER,
    addressee_id INTEGER,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    UNIQUE(requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

module.exports = db;

