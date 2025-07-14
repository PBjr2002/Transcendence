const db = require('./db');
const bcrypt = require('bcrypt');

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}

async function addUser(name, info, email, password) {
	const hashedPass = await bcrypt.hash(password, 10);
	const userInfo = db.prepare('INSERT INTO users (name , info, email, password) VALUES (? , ? , ? , ?)');
	return userInfo.run(name, info, email, hashedPass);
}

function getUserByName(name) {
	return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
};

async function getUserByEmailOrUser(emailOrUser, password) {
	const user = db.prepare('SELECT * FROM users WHERE email = ? OR name = ?').get(emailOrUser, emailOrUser);
	if (!user)
		return null;
	const isPassValid = await bcrypt.compare(password, user.password);
	if (!isPassValid)
		return null;
	return user;
}

module.exports = { getAllUsers, addUser, getUserByName, getUserByEmailOrUser };
