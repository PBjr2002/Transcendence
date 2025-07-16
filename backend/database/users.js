const db = require('./db');
const bcrypt = require('bcrypt');

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}

async function addUser(name, info, email, password) {
	const hashedPass = await bcrypt.hash(password, 10);
	const userInfo = db.prepare('INSERT INTO users (name , info, email, password, online) VALUES (? , ? , ? , ?, false)');
	return userInfo.run(name, info, email, hashedPass);
}

function getUserByName(name) {
	return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
};

function checkIfEmailIsUsed(email) {
	return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
};

function getUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

async function getUserByEmailOrUser(emailOrUser, password) {
	const user = db.prepare('SELECT * FROM users WHERE email = ? OR name = ?').get(emailOrUser, emailOrUser);
	if (!user)
		return null;
	const isPassValid = await bcrypt.compare(password, user.password);
	if (!isPassValid)
		return null;
	return user;
}

function updateUser(id, { name, info, email, password }) {
	const userUpdated = db.prepare('UPDATE users SET name = ?, info = ?, email = ?, password = ? WHERE id = ?');
	if (!userUpdated)
		return null;
	return userUpdated.run(name, info, email, password, id);
}

function loginUser(name) {
	return db.prepare('UPDATE users SET online = true WHERE name = ?').run(name);
}

function logoutUser(name) {
	return db.prepare('UPDATE users SET online = false WHERE name = ?').run(name);
}

module.exports = {
	getAllUsers,
	addUser,
	getUserByName,
	checkIfEmailIsUsed,
	getUserById,
	getUserByEmailOrUser,
	updateUser,
	loginUser,
	logoutUser
};
