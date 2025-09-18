import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DBPath = resolve(__dirname, '../database_data/database.db');
const db = new Database(DBPath);
db.pragma('foreign_keys = ON');

export default db;

