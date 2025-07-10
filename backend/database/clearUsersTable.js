const db = require('./db');
db.prepare('DROP TABLE IF EXISTS users').run();
db.prepare(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    info TEXT,
    email TEXT UNIQUE,
    password TEXT UNIQUE
  )
`).run();
console.log('Users table has been reset.');