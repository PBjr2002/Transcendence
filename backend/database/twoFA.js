import db from './db.js';
import bcrypt from 'bcrypt';

function setNewTwoFaSecret(newSecret, userId) {
	const createdDate = Date.now();
	const expireDate = Date.now() + 3600000;
	const newFa = db.prepare(`INSERT INTO twoFa (userId, twoFASecret, createdDate, expireDate, status) VALUES (?, ?, ?, ?, 'pending')`).run(userId, newSecret, createdDate, expireDate);
	if (!newFa)
		return { success: false, errorMsg: "Error when setting the 2FA secret", status: 400 };
	return {
		success: true,
		newFa: newFa
	};
}

async function storeHashedTwoFaSecret(userId) {
	const twoFa = getTwoFaById(userId);
	if (!twoFa.success)
		return { success: false, errorMsg: twoFa.errorMsg, status: twoFa.status };
	const hashedSecret = await bcrypt.hash(twoFa.twoFASecret, 10);
	const twoFaHashed = db.prepare('UPDATE twoFa SET twoFASecret = ? WHERE userId = ?').run(hashedSecret, userId);
	if (!twoFaHashed)
		return { success: false, errorMsg: "Error updating the twoFASecret", status: 400 };
	return {
		success: true,
		updated: twoFaHashed
	};
}

async function resetTwoFaSecret(newSecret, userId) {
	const newCreatedDate = Date.now();
	const newExpireDate = Date.now() + 3600000;
	const newHashedCode = await bcrypt.hash(newSecret, 10);
	const newTwoFaSecret = db.prepare('UPDATE twoFa SET twoFASecret = ?, createdDate = ?, expireDate = ? WHERE userId = ?').run(newHashedCode, newCreatedDate, newExpireDate, userId);
	if (!newTwoFaSecret)
		return { success: false, errorMsg: "Error reseting the twoFaSecret", status: 400 };
	return {
		success: true,
		reseted: newTwoFaSecret
	};
}

async function compareTwoFACodes(code, userId) {
	const twoFA = getTwoFaById(userId);
	if (!twoFA.success)
		return { success: false, errorMsg: twoFA.errorMsg, status: twoFA.status };
	const isCodeValid = await bcrypt.compare(code, twoFA.twoFASecret);
	if (!isCodeValid)
		return { success: false, errorMsg: "2FA secret is invalid", status: 403 };
	const actualDate = Date.now();
	if (actualDate > twoFA.expireDate)
		return { success: false, errorMsg: "2FA secret already expired", status: 400 };
	return {
		success: true
	};
}

function enableTwoFa(userId) {
	const updated = db.prepare(`UPDATE twoFa SET status = 'enabled' WHERE userId = ?`).run(userId);
	if (!updated)
		return { success: false, errorMsg: "Error enabling 2FA", status: 400 };
	return {
		success: true,
		updated: updated
	};
}

function disableTwofa(userId) {
	const updated = db.prepare(`UPDATE twoFa SET status = 'disabled' WHERE userId = ?`).run(userId);
	if (!updated)
		return { success: false, errorMsg: "Error disabling 2FA", status: 400 };
	return {
		success: true,
		updated: updated
	};
}

function getTwoFaById(userId) {
	const twoFa = db.prepare('SELECT * FROM twoFa WHERE userId = ?').get(userId);
	if (!twoFa)
		return { success: false, errorMsg: "2FA not found", status: 404 };
	return {
		success: true,
		twoFa: twoFa
	};
}

function deleteTwoFa(userId) {
	const deleted = db.prepare('DELETE FROM twoFa WHERE userId = ?').run(userId);
	if (!deleted)
		return { success: false, errorMsg: "Error deleting 2FA", status: 400 };
	return {
		success: true,
		deleted: deleted
	};
}

export {
	setNewTwoFaSecret,
	storeHashedTwoFaSecret,
	resetTwoFaSecret,
	compareTwoFACodes,
	enableTwoFa,
	disableTwofa,
	getTwoFaById,
	deleteTwoFa
};

export default {
	setNewTwoFaSecret,
	storeHashedTwoFaSecret,
	resetTwoFaSecret,
	compareTwoFACodes,
	enableTwoFa,
	disableTwofa,
	getTwoFaById,
	deleteTwoFa
};
