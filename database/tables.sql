PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE,
	info TEXT,
	email TEXT UNIQUE,
	password TEXT,
	profile_picture TEXT DEFAULT 'default.jpg',
	online BOOL,
	wins INTEGER,
	defeats INTEGER,
	country TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS friends (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	userId1 INTEGER,
	userId2 INTEGER,
	status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
	blocked_by INTEGER DEFAULT NULL,
	UNIQUE(userId1, userId2),
	FOREIGN KEY (userId1) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (userId2) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL,
	CHECK (userId1 != userId2)
);

CREATE TABLE IF NOT EXISTS ChatRoom (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	userId1 INTEGER,
	userId2 INTEGER,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (userId1, userId2),
	FOREIGN KEY (userId1) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (userId2) REFERENCES users(id) ON DELETE CASCADE,
	CHECK (userId1 != userId2)
);

CREATE TABLE IF NOT EXISTS Messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	chatRoomId INTEGER,
	fromId INTEGER,
	toId INTEGER,
	messageText TEXT NOT NULL,
	Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (chatRoomId) REFERENCES ChatRoom(id) ON DELETE CASCADE,
	FOREIGN KEY (fromId) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (toId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS twoFa (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	userId INTEGER,
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
	score STRING DEFAULT NULL,
	powerUp BOOL,
	FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (loserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(online);

CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(userId1);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends(userId2);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

CREATE INDEX IF NOT EXISTS idx_messages_chatroom ON Messages(chatRoomId);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON Messages(Timestamp);

CREATE INDEX IF NOT EXISTS idx_twofa_user ON twoFa(userId);

CREATE INDEX IF NOT EXISTS idx_match_winner ON MatchHistory(winnerId);
CREATE INDEX IF NOT EXISTS idx_match_loser ON MatchHistory(loserId);
CREATE INDEX IF NOT EXISTS idx_match_date ON MatchHistory(date);
