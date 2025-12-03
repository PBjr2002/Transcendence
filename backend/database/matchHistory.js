import db from './db.js';

function addNewGame(user1Id, user2Id) {
	const date =  Date.now();
	const newGame = db.prepare('INSERT INTO MatchHistory (winnerId, loserId, date) VALUES (?, ?, ?)').run(user1Id, user2Id, date);
	if (!newGame)
		return { success: false, errorMsg: "Error adding new game to matchHistory", status: 400 };
	return {
		success: true,
		newGame: newGame
	};
}

function addNewEmptyGame() {
	const date = Date.now();
	const newGame = db.prepare('INSERT INTO MatchHistory (date) VALUES (?)').run(date);
	if (!newGame)
		return { success: false, errorMsg: "Error adding a new empty game", status: 400 };
	if (typeof newGame.lastInsertRowid === 'number')
		return { success: true, newEmptyGameID: result.lastInsertedRowid };
	return {
		success: false,
		errorMsg: "Error adding a new empty game",
		status: 400
	};
}

function setWinnerAndLoser(gameId, winnerId, loserId) {
	const updated = db.prepare('UPDATE MatchHistory SET winnerId = ?, loserId = ? WHERE id = ?').run(winnerId, loserId, gameId);
	if (!updated)
		return { success: false, errorMsg: "Match not found", status: 404 };
	return {
		success: true,
		updatedGame: updated
	};
}

function getMatchHistoryById(userId) {
	const matchHistory = db.prepare('SELECT * FROM MatchHistory WHERE winnerId = ? OR loserId = ? ORDER BY date DESC').all(userId, userId);
	if (!matchHistory)
		return { success: false, errorMsg: "No Match History", status: 404 };
	return {
		success: true,
		matchHistory: matchHistory
	};
}

function getUserWinsById(userId) {
	const user = db.prepare('SELECT COUNT(*) AS wins FROM MatchHistory WHERE winnerId = ?').get(userId);
	if (!user)
		return { success: false, errorMsg: "No matches with that ID found", status: 404 };
	return {
		success: true,
		wins: user.wins
	};
}

function getUserDefeatsById(userId) {
	const user = db.prepare('SELECT COUNT(*) AS defeats FROM MatchHistory WHERE loserId = ?').get(userId);
	if (!user)
		return { success: false, errorMsg: "No matches with that ID found", status: 404 };
	return {
		success: true,
		defeats: user.defeats
	};
}

function setPowerUpFlag(gameId, flag) {
	const updated = db.prepare('UPDATE MatchHistory SET powerUp = ? WHERE id = ?').run(flag, gameId);
	if (!updated)
		return { success: false, errorMsg: "Error updating the powerUp flag", status: 400 };
	return {
		success: true,
		updatedGame: updated
	};
}

function getPoweUpFlag(gameId) {
	const game = db.prepare('SELECT * FROM MatchHistory WHERE id = ?').get(gameId);
	if (!game)
		return { success: false, errorMsg: "No games found", status: 404 };
	return {
		success: true,
		powerUp: game.powerUp
	};
}

function setGameScore(gameId, score) {
	const updated = db.prepare('UPDATE MatchHistory SET score = ? WHERE id = ?').run(score, gameId);
	if (!updated)
		return { success: false, errorMsg: "Error updating the game score", status: 400 };
	return {
		success: true,
		updatedGame: updated
	};
}

function getGameScore(gameId) {
	const game = db.prepare('SELECT * FROM MatchHistory WHERE id = ?').get(gameId);
	if (!game)
		return { success: false, errorMsg: "No games found", status: 404 };
	return {
		success: true,
		score: game.score
	};
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
