import db from './db.js';

function sendFriendRequest(requesterId, addresseeId) {
	return db.prepare(`INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, 'pending')`).run(requesterId, addresseeId);
}

function acceptFriendRequest(requesterId, addresseeId) {
	return db.prepare(`UPDATE friends SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?`).run(requesterId, addresseeId);
}

function blockUser(requesterId, addresseeId) {
	return db.prepare(`UPDATE friends SET status = 'blocked' WHERE requester_id = ? AND addressee_id = ?`).run(requesterId, addresseeId);
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

function checkFriendshipStatus(userId1, userId2) {
	const friendship = checkFriendshipExists(userId1, userId2);
	if (!friendship)
		throw new Error('Friendship does not exist');
	return (friendship.status);
}

function checkIfFriendshipBlocked(userId1, userId2) {
	const status = checkFriendshipStatus(userId1, userId2);
	if (status === 'blocked')
		return (true);
	else
		return (false);
}

export {
	sendFriendRequest,
	acceptFriendRequest,
	blockUser,
	getFriends,
	getPendingRequests,
	checkFriendshipExists,
	undoFriendship,
	checkFriendshipStatus,
	checkIfFriendshipBlocked
};

export default {
	sendFriendRequest,
	acceptFriendRequest,
	blockUser,
	getFriends,
	getPendingRequests,
	checkFriendshipExists,
	undoFriendship,
	checkFriendshipStatus,
	checkIfFriendshipBlocked
};
