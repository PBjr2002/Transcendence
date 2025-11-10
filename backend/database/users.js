import db from './db.js';
import bcrypt from 'bcrypt';
import { getUserWinsById, getUserDefeatsById } from './matchHistory.js';

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}

async function addUser(name, info, email, password, phoneNumber) {
	const hashedPass = await bcrypt.hash(password, 10);
	const userInfo = db.prepare('INSERT INTO users (name , info, email, password, online, phoneNumber, wins, defeats) VALUES (? , ? , ? , ?, false, ?, 0, 0)');
	return userInfo.run(name, info, email, hashedPass, phoneNumber);
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

function updateUserOnlineStatus(userId, online) {
	const user = db.prepare('UPDATE users SET online = ? WHERE id = ?');
	return user.run(online ? 1 : 0, userId);
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

function getUserProfilePath(userId) {
	const user = getUserById(userId);
	if (!user)
		return null;
 	return user.profile_picture || null;
}

function setUserProfilePath(userId, newPath) {
	return db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?').run(newPath, userId);
}

function setUserCountry(userId, country) {
	return db.prepare('UPDATE users SET country = ? WHERE id = ?').run(country, userId);
}

function getUserCountry(userId) {
	const user = getUserById(userId);
	if (!user)
		return null;
	return user.country;
}

function isUserAlreadyOnline(userId) {
	const user = getUserById(userId);
	if (!user)
		return null;
	return user.online;
}

export {
	getAllUsers,
	addUser,
	getUserByName,
	checkIfEmailIsUsed,
	getUserById,
	getUserByEmailOrUser,
	updateUser,
	updateUserOnlineStatus,
	loginUser,
	logoutUser,
	removeUser,
	setPhoneNumber,
	getPhoneNumber,
	getUserWins,
	getUserDefeats,
	updateUserWins,
	updateUserDefeats,
	getUserWinrate,
	getUserProfilePath,
	setUserProfilePath,
	setUserCountry,
	getUserCountry,
	isUserAlreadyOnline
};

export default {
	getAllUsers,
	addUser,
	getUserByName,
	checkIfEmailIsUsed,
	getUserById,
	getUserByEmailOrUser,
	updateUser,
	updateUserOnlineStatus,
	loginUser,
	logoutUser,
	removeUser,
	setPhoneNumber,
	getPhoneNumber,
	getUserWins,
	getUserDefeats,
	updateUserWins,
	updateUserDefeats,
	getUserWinrate,
	getUserProfilePath,
	setUserProfilePath,
	setUserCountry,
	getUserCountry,
	isUserAlreadyOnline
};
