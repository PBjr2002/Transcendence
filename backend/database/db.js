const path = require('path');
const Database = require('better-sqlite3');
const DBPath = path.resolve(__dirname, '../database_data/database.db');
const db = new Database(DBPath);
db.pragma('foreign_keys = ON');

module.exports = db;

