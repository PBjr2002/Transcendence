const db = require('./db');

function getAllUsers() {
  return db.prepare('SELECT * FROM users').all();
}

function addUser(name, info) {
	const userInfo = db.prepare('INSERT INTO users (name , info) VALUES (? , ?)');
  return userInfo.run(name, info);
}

function getUserByName(name) {
  return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
};

module.exports = { getAllUsers, addUser, getUserByName };
