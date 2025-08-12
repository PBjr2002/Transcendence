const db = require('./db');
const bcrypt = require('bcrypt');
const { getUserWinsById, getUserDefeatsById } = require('./matchHistory');

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}

async function addUser(name, info, email, password) {
	const hashedPass = await bcrypt.hash(password, 10);
	const userInfo = db.prepare('INSERT INTO users (name , info, email, password, online, phoneNumber, wins, defeats) VALUES (? , ? , ? , ?, false, null, 0, 0)');
	return userInfo.run(name, info, email, hashedPass);
}

function getUserByName(name) {
	return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
};

function checkIfEmailIsUsed(email) {
	return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
};

function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?');
  return user.get(id);
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

function removeUser(userId) {
	return db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

function setPhoneNumber(userId, number) {
	return db.prepare('UPDATE users SET phoneNumber = ? WHERE id = ?').run(number, userId);
}

function getPhoneNumber(userId) {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').run(userId);
	return user.get(phoneNumber);
}

function getUserWins(userId) {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').run(userId);
	return user.get(wins);
}

function getUserDefeats(userId) {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').run(userId);
	return user.get(losses);
}

function updateUserWins(userId) {
	const wins = getUserWinsById(userId);
	return db.prepare('UPDATE users SET wins = ? WHERE id = ?').run(wins, userId); 
}

function updateUserDefeats(userId) {
	const defeats = getUserDefeatsById(userId);
	return db.prepare('UPDATE users SET defeats = ? WHERE id = ?').run(defeats, userId);
}

function getUserWinrate(userId) {
	const wins = getUserWins(userId);
	const losses = getUserDefeats(userId);
	const totalGames = wins + losses;
	if (totalGames === 0)
		return 0;
	return (wins / totalGames) * 100;
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
	logoutUser,
	removeUser,
	setPhoneNumber,
	getPhoneNumber,
	getUserWins,
	getUserDefeats,
	updateUserWins,
	updateUserDefeats,
	getUserWinrate
};
