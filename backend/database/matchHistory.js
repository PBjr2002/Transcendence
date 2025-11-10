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

function setPowerUpFlag(userId, flag) {
	const game = getMatchHistoryById(userId);
	if (!game)
		return null;
	return db.prepare('UPDATE MatchHistory SET powerUp = ? WHERE id = ?').run(flag, game.id);
}

function getPoweUpFlag(userId) {
	const game = getMatchHistoryById(userId);
	if (!game)
		return null;
	return game.powerUp;
}

function setGameScore(userId, score) {
	const game = getMatchHistoryById(userId);
	if (!game)
		return null;
	return db.prepare('UPDATE MatchHistory SET score = ? WHERE id = ?').run(score, game.id);
}

function getGameScore(userId) {
	const game = getMatchHistoryById(userId);
	if (!game)
		return null;
	return game.score;
}

export {
	addNewGame,
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
	getMatchHistoryById,
	getUserWinsById,
	getUserDefeatsById,
	setPowerUpFlag,
	getPoweUpFlag,
	setGameScore,
	getGameScore
};
