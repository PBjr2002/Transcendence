import db from './db.js';

function addNewGame(user1Id, user2Id) {
	const date =  Date.now();
	const newGame = db.prepare('INSERT INTO MatchHistory (winnerId, loserId, date) VALUES (?, ?, ?)');
	return newGame.run(user1Id, user2Id, date);
}

function addNewEmptyGame() {
	const date = Date.now();
	const newGame = db.prepare('INSERT INTO MatchHistory (date) VALUES (?)');
	const result = newGame.run(date);
	if (result && typeof result.lastInsertRowid === 'number')
		return result.lastInsertedRowid;
	return -1;
}

function setWinnerAndLoser(gameId, winnerId, loserId) {
	return db.prepare('UPDATE MatchHistory SET winnerId = ?, loserId = ? WHERE id = ?').run(winnerId, loserId, gameId);
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

function setPowerUpFlag(gameId, flag) {
	return db.prepare('UPDATE MatchHistory SET powerUp = ? WHERE id = ?').run(flag, gameId);
}

function getPoweUpFlag(gameId) {
	const game = db.prepare('SELECT * FROM MatchHistory WHERE id = ?').get(gameId);
	if (!game)
		return null;
	return game.powerUp;
}

function setGameScore(gameId, score) {
	return db.prepare('UPDATE MatchHistory SET score = ? WHERE id = ?').run(score, gameId);
}

function getGameScore(gameId) {
	const game = db.prepare('SELECT * FROM MatchHistory WHERE id = ?').get(gameId);
	if (!game)
		return null;
	return game.score;
}

export {
	addNewGame,
	addNewEmptyGame,
	setWinnerAndLoser,
	getMatchHistoryById,
	getUserWinsById,
	getUserDefeatsById,
	setPowerUpFlag,
	getPoweUpFlag,
	setGameScore,
	getGameScore
};

export default {
	addNewGame,
	addNewEmptyGame,
	setWinnerAndLoser,
	getMatchHistoryById,
	getUserWinsById,
	getUserDefeatsById,
	setPowerUpFlag,
	getPoweUpFlag,
	setGameScore,
	getGameScore
};
