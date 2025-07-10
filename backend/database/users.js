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

function getUserByEmail(email, password) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
}

module.exports = { getAllUsers, addUser, getUserByName, getUserByEmail };
