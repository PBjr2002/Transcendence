import db from './db.js';

function sendFriendRequest(userId, friendId) {
	const friendRequest = db.prepare(`INSERT INTO friends (userId1, userId2, status) VALUES (?, ?, 'pending')`).run(userId, friendId);
	if (!friendRequest)
		return { success: false, errorMsg: "Error creating the friendship", status: 400 };
	return {
		success: true,
		friendRequest: friendRequest
	};
}

function acceptFriendRequest(userId, friendId) {
	const friendRequest = db.prepare(`UPDATE friends SET status = 'accepted' WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)`).run(userId, friendId, friendId, userId);
	if (!friendRequest)
		return { success: false, errorMsg: "Friendship not found", status: 404 };
	return {
		success: true,
		friendRequest: friendRequest
	};
}

function blockUser(userId, friendId, blockerId) {
	const blocked = db.prepare(`UPDATE friends SET status = 'blocked', blocked_by = ? WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)`).run(blockerId, userId, friendId, friendId, userId);
	if (!blocked)
		return { success: false, errorMsg: "Friendship not found", status: 404 };
	return {
		success: true,
		blocked: blocked
	};
}

function unblockUser(userId, friendId, blockerId) {
	const unblocked = db.prepare(`UPDATE friends SET status = 'accepted', blocked_by = NULL WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?) AND blocked_by = ?`).run(userId, friendId, friendId, userId, blockerId);
	if (!unblocked)
		return { success: false, errorMsg: "Friendship not found", status: 404 };
	return {
		success: true,
		unblocked: unblocked
	} 
}

function getFriends(userId) {
	const friendsList = db.prepare(`SELECT u.id, u.name, u.email, u.info, u.online FROM users u JOIN friends f ON (
		(f.userId1 = ? AND f.userId2 = u.id AND f.status = 'accepted') OR
    	(f.userId2 = ? AND f.userId1 = u.id AND f.status = 'accepted')
    )`).all(userId, userId);
	if (!friendsList)
		return { success: false, errorMsg: "No friends found", status: 404 };
	return {
		success: true,
		friendsList: friendsList
	};
}

function getPendingRequests(userId) {
	const pending = db.prepare(`SELECT f.userId1, u.name, u.email FROM friends f
    	JOIN users u ON u.id = f.userId1
    	WHERE f.userId2 = ? AND f.status = 'pending'`).all(userId);
	if (!pending)
		return { success: false, errorMsg: "No pending requests", status: 404 };
	return {
		success: true,
		pendingRequests: pending
	};
}

function checkFriendshipExists(user1, user2) {
	const friendship = db.prepare(`SELECT * FROM friends WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)`).get(user1, user2, user2, user1);
	if (!friendship)
		return { success: false, errorMsg: "Friendship not found", status: 404 };
	return {
		success: true,
		friendship: friendship
	} 
}

function undoFriendship(userId1, userId2) {
	const friendship = db.prepare(`DELETE FROM friends WHERE (userId1 = ? AND userId2 = ?) OR 
		(userId1 = ? AND userId2 = ?)`).run(userId1, userId2, userId2, userId1);
	if (!friendship)
		return { success: false, errorMsg: "Friendship not found", status: 404 };
	return {
		success: true,
		deletedFriendship: friendship
	}
}

function checkFriendshipStatus(userId1, userId2) {
	const friendship = checkFriendshipExists(userId1, userId2);
	if (!friendship.success)
		return { success: false, errorMsg: 'Friendship does not exist', status: 404 };
	return {
		success: true,
		status: friendship.friendship.status
	};
}

function checkIfFriendshipBlocked(userId1, userId2) {
	const status = checkFriendshipStatus(userId1, userId2);
	if (!status.success)
		return { success: false, errorMsg: status.errorMsg, status: status.status };
	if (status.status === 'blocked')
		return { success: true };
	else
		return { success: false };
}

function checkIfUserCanUnblock(userId1, userId2) {
	const friendship = checkFriendshipExists(userId1, userId2);
	if (!friendship.success)
		return { success: false, errorMsg: 'Friendship does not exist', status: 404 };
	if (friendship.friendship.blocked_by && friendship.friendship.blocked_by === userId1)
		return { success: true };
	else
		return { success: false };
}

export {
	sendFriendRequest,
	acceptFriendRequest,
	blockUser,
	unblockUser,
	getFriends,
	getPendingRequests,
	checkFriendshipExists,
	undoFriendship,
	checkFriendshipStatus,
	checkIfFriendshipBlocked,
	checkIfUserCanUnblock
};

export default {
	sendFriendRequest,
	acceptFriendRequest,
	blockUser,
	unblockUser,
	getFriends,
	getPendingRequests,
	checkFriendshipExists,
	undoFriendship,
	checkFriendshipStatus,
	checkIfFriendshipBlocked,
	checkIfUserCanUnblock
};
