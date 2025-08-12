PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE,
	info TEXT,
	email TEXT UNIQUE,
	password TEXT UNIQUE,
	phoneNumber TEXT UNIQUE,
	online BOOL,
	wins INTEGER,
	defeats INTEGER
);

CREATE TABLE IF NOT EXISTS friends (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	requester_id INTEGER,
	addressee_id INTEGER,
	status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
	UNIQUE(requester_id, addressee_id),
	FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS twoFa (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	userId INTEGER,
	twoFAType TEXT CHECK(twoFAType IN ('SMS', 'EMAIL', 'QR', 'disabled')) DEFAULT 'disabled',
	twoFASecret TEXT,
	createdDate INTEGER,
	expireDate INTEGER,
	status TEXT CHECK(status IN ('pending', 'enabled', 'disabled')) DEFAULT 'disabled',
	FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MatchHistory (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	winnerId INTEGER,
	loserId INTEGER,
	date INTEGER,
	FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (loserId) REFERENCES users(id) ON DELETE CASCADE
);
