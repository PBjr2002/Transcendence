const Database = require('better-sqlite3');
const db = new Database('mydb.sqlite');
db.pragma('foreign_keys = ON');

/* db.prepare('DROP TABLE IF EXISTS friends').run();
db.prepare('DROP TABLE IF EXISTS twoFa').run();
db.prepare('DROP TABLE IF EXISTS users').run(); */

db.prepare(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE,
		info TEXT,
		email TEXT UNIQUE,
		password TEXT UNIQUE,
		phoneNumber TEXT UNIQUE,
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

db.prepare(`
	CREATE TABLE IF NOT EXISTS twoFa (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		userId INTEGER,
		twoFAType TEXT CHECK(twoFAType IN ('SMS', 'EMAIL', 'QR', 'disabled')) DEFAULT 'disabled',
		twoFASecret TEXT,
		createdDate INTEGER,
		expireDate INTEGER,
		status TEXT CHECK(status IN ('pending', 'enabled', 'disabled')) DEFAULT 'disabled',
		FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
	)
`).run();

module.exports = db;

