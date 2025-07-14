const db = require('./db');

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}

function addUser(name, info, email, password) {
	const userInfo = db.prepare('INSERT INTO users (name , info, email, password) VALUES (? , ? , ? , ?)');
  return userInfo.run(name, info, email, password);
}

function getUserByName(name) {
	return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
};

function getUserByEmailOrUser(emailOrUser, password) {
  return db.prepare('SELECT * FROM users WHERE (email = ? OR name = ?) AND password = ?').get(emailOrUser, emailOrUser, password);
}

module.exports = { getAllUsers, addUser, getUserByName, getUserByEmailOrUser };
