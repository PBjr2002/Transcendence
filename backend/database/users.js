import db from './db.js';
import bcrypt from 'bcrypt';
import { getUserWinsById, getUserDefeatsById } from './matchHistory.js';

function getAllUsers() {
	const users = db.prepare('SELECT * FROM users').all();
	if (!users)
		return { success: false, errorMsg: "No users found", status: 404 };
	return {
		success: true,
		users: users
	};
}

async function addUser(name, info, email, password, phoneNumber) {
	const hashedPass = await bcrypt.hash(password, 10);
	const newUser = db.prepare('INSERT INTO users (name , info, email, password, online, phoneNumber, wins, defeats) VALUES (? , ? , ? , ?, false, ?, 0, 0)').run(name, info, email, hashedPass, phoneNumber);
	if (!newUser)
		return { success: false, errorMsg: "Error adding a new User", status: 400 };
	return {
		success: true,
		newUser: newUser
	};
}

function getUserByName(name) {
	const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
	if (!user)
		return { success: false, errorMsg: "User not found", status: 404 };
	return {
		success: true,
		user: user
	};
};

function checkIfEmailIsUsed(email) {
	const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
	if (!user)
		return { success: false, errorMsg: "User not found", status: 404 };
	return {
		success: true,
		user: user
	};
};

function getUserById(id) {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
	if (!user)
		return { success: false, errorMsg: "User not found", status: 404 };
	return {
		success: true,
		user: user
	};
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
	if (!user)
		return null;
	return user.phoneNumber;
}

function getUserWins(userId) {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').run(userId);
	if (!user)
		return null;
	return user.wins;
}

function getUserDefeats(userId) {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').run(userId);
	if (!user)
		return null;
	return user.defeats;
}

function updateUserWins(userId) {
	const wins = getUserWinsById(userId);
	if (!wins.success)
		return { success: false, errorMsg: wins.errorMsg, status: wins.status };
	const updated = db.prepare('UPDATE users SET wins = ? WHERE id = ?').run(wins, userId);
	if (!updated)
		return { success: false, errorMsg: "Error updating the User wins", status: 400 };
	return {
		success: true,
		updatedUser: updated
	};
}

function updateUserDefeats(userId) {
	const defeats = getUserDefeatsById(userId);
	if (!defeats.success)
		return { success: false, errorMsg: defeats.errorMsg, status: defeats.status };
	const updated = db.prepare('UPDATE users SET defeats = ? WHERE id = ?').run(defeats, userId);
	if (!updated)
		return { success: false, errorMsg: "Error updating the User defeats", status: 400 };
	return {
		success: true,
		updatedUser: updated
	};
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
	if (!user.success)
		return { success: false, errorMsg: user.errorMsg, status: user.status };
	return {
		success: true,
		profile_picture: user.user.profile_picture
	};
}

function setUserProfilePath(userId, newPath) {
	return db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?').run(newPath, userId);
}

function setUserCountry(userId, country) {
	return db.prepare('UPDATE users SET country = ? WHERE id = ?').run(country, userId);
}

function getUserCountry(userId) {
	const user = getUserById(userId);
	if (!user.success)
		return { success: false, errorMsg: user.errorMsg, status: user.status };
	return {
		success: true,
		country: user.user.country
	};
}

function isUserAlreadyOnline(userId) {
	const user = getUserById(userId);
	if (!user.success)
		return { success: false, errorMsg: user.errorMsg, status: user.status };
	return {
		success: true,
		online: user.user.online
	};
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
