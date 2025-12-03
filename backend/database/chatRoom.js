import db from './db.js';

function createOrGetChatRoom(userId1, userId2) {
	const chatRoom = db.prepare(`SELECT * FROM ChatRoom WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)`).get(userId1, userId2, userId2, userId1);
	if (chatRoom)
		return { success: true, chatRoom: chatRoom };
	const newChatRoom = db.prepare(`INSERT INTO ChatRoom (userId1, userId2) VALUES (?, ?)`).run(userId1, userId2);
	if (!newChatRoom)
		return { success: false, errorMsg: "Error creating new Chat Room", status: 400 };
	const cleanRoom = getChatRoom(newChatRoom.lastInsertRowid);
	if (!cleanRoom.success)
		return { success: false, errorMsg: cleanRoom.errorMsg, status: cleanRoom.status };
	return {
		success: true,
		chatRoom: cleanRoom.chatRoom
	};
}

function getChatRoom(chatRoomId) {
	const chatRoom = db.prepare('SELECT * FROM ChatRoom WHERE id = ?').get(chatRoomId);
	if (!chatRoom)
		return { success: false, errorMsg: "Chat Room not found", status: 404 };
	return {
		success: true,
		chatRoom: chatRoom
	}
}

function getUserChatRooms(userId) {
	const chatRooms = db.prepare('SELECT * FROM ChatRoom WHERE (userId1 = ?) OR (userId2 = ?)').all(userId, userId);
	if (!chatRooms)
		return { success: false, errorMsg: "No Chat Room found", status: 404 };
	return {
		success: true,
		chatRooms: chatRooms
	};
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
