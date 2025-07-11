const db = require('./db');
const bcrypt = require('bcrypt');

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}

async function addUser(name, info, email, password) {
	const hashedPassword = await bcrypt.hash(password, 10);
	return userInfo.prepare('INSERT INTO users (name , info, email, password) VALUES (? , ? , ? , ?)', [name, info, email, hashedPassword]);
}

function getUserByName(name) {
	return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
};

async function getUserByEmailOrUser(emailOrUser) {
	const user = db.prepare('SELECT * FROM users WHERE email = ? OR name = ?').get(emailOrUser, emailOrUser);
	if (!user)
		return null;
	return user;
}

module.exports = { getAllUsers, addUser, getUserByName, getUserByEmailOrUser };
