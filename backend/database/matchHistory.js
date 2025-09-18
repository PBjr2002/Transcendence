import db from './db.js';

function addNewGame(user1Id, user2Id) {
	const date =  Date.now();
	const newGame = db.prepare('INSERT INTO MatchHistory (winnerId, loserId, date) VALUES (?, ? ,? ,?)');
	return newGame.run(user1Id, user2Id, date);
}

function getMatchHistoryById(userId) {
	return db.prepare('SELECT * FROM MatchHistory WHERE winnerId = ? OR loserId = ? ORDER BY date DESC').all(userId, userId);
}

function getUserWinsById(userId) {
	return db.prepare('SELECT COUNT(*) AS wins FROM MatchHistory WHERE winnerId = ?').get(userId).wins;
}

function getUserDefeatsById(userId) {
	return db.prepare('SELECT COUNT(*) AS defeats FROM MatchHistory WHERE loserId = ?').get(userId).defeats;
}

export {
	addNewGame,
	getMatchHistoryById,
	getUserWinsById,
	getUserDefeatsById
};

export default {
	addNewGame,
	getMatchHistoryById,
	getUserWinsById,
	getUserDefeatsById
};
