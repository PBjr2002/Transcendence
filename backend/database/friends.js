const db = require('./db');

function sendFriendRequest(requesterId, addresseeId) {
	return db.prepare(`INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, 'pending')`).run(requesterId, addresseeId);
}

function acceptFriendRequest(requesterId, addresseeId) {
	return db.prepare(`UPDATE friends SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?`).run(requesterId, addresseeId);
}

function getFriends(userId) {
	return db.prepare(`SELECT u.id, u.name, u.email, u.info, u.online FROM users u JOIN friends f ON (
		(f.requester_id = ? AND f.addressee_id = u.id AND f.status = 'accepted') OR
    	(f.addressee_id = ? AND f.requester_id = u.id AND f.status = 'accepted')
    )`).all(userId, userId);
}

function getPendingRequests(userId) {
	return db.prepare(`SELECT f.requester_id, u.name, u.email FROM friends f
    	JOIN users u ON u.id = f.requester_id
    	WHERE f.addressee_id = ? AND f.status = 'pending'`).all(userId);
}

function checkFriendshipExists(user1, user2) {
	return db.prepare(`SELECT * FROM friends WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`).get(user1, user2, user2, user1);
}

function undoFriendship(requesterId, addresseeId) {
	return db.prepare(`DELETE FROM friends WHERE (requester_id = ? AND addressee_id = ?) OR 
		(requester_id = ? AND addressee_id = ?)`).run(requesterId, addresseeId, addresseeId, requesterId);
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getPendingRequests,
  checkFriendshipExists,
  undoFriendship
};
