import db from './db.js';

function createOrGetChatRoom(userId1, userId2) {
	const chatRoom = db.prepare(`SELECT * FROM ChatRoom WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)`).get(userId1, userId2, userId2, userId1);
	if (chatRoom)
		return (chatRoom);
	const newChatRoom = db.prepare(`INSERT INTO ChatRoom (userId1, userId2) VALUES (?, ?)`).run(userId1, userId2);
	return (getChatRoom(newChatRoom.lastInsertRowid));
}

function getChatRoom(chatRoomId) {
	return (db.prepare('SELECT * FROM ChatRoom WHERE id = ?').get(chatRoomId));
}

function getUserChatRooms(userId) {
	return (db.prepare('SELECT * FROM ChatRoom WHERE (userId1 = ?) OR (userId2 = ?)').all(userId, userId));
}

export {
	createOrGetChatRoom,
	getChatRoom,
	getUserChatRooms
};

export default {
	createOrGetChatRoom,
	getChatRoom,
	getUserChatRooms
};
