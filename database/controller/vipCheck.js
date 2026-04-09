const Vip = require("../models/vip");

/**
 * Centralized VIP check using MongoDB.
 * Returns true if the user is an admin or has an active VIP subscription.
 * @param {string} userID
 * @returns {Promise<boolean>}
 */
async function checkVip(userID) {
    try {
        const adminList = global.GoatBot?.config?.adminBot || [];
        if (adminList.includes(userID)) return true;

        const record = await Vip.findOne({ userID }).lean();
        return !!(record && record.expiry > Date.now());
    } catch (err) {
        console.error("[VIP] checkVip error:", err.message);
        return false;
    }
}

/**
 * Get full VIP record for a user. Returns null if not VIP.
 * @param {string} userID
 * @returns {Promise<{userID, expiry, start}|null>}
 */
async function getVipRecord(userID) {
    try {
        const record = await Vip.findOne({ userID }).lean();
        if (!record || record.expiry <= Date.now()) return null;
        return record;
    } catch (err) {
        console.error("[VIP] getVipRecord error:", err.message);
        return null;
    }
}

/**
 * Grant or extend VIP for a user.
 * @param {string} userID
 * @param {number} days
 * @returns {Promise<{expiry: number, isNew: boolean}>}
 */
async function grantVip(userID, days) {
    const ms = days * 24 * 60 * 60 * 1000;
    const existing = await Vip.findOne({ userID }).lean();
    const base = (existing && existing.expiry > Date.now()) ? existing.expiry : Date.now();
    const newExpiry = base + ms;

    await Vip.findOneAndUpdate(
        { userID },
        { expiry: newExpiry, start: existing?.start || Date.now() },
        { upsert: true, new: true }
    );

    return { expiry: newExpiry, isNew: !existing };
}

/**
 * Remove VIP for a user.
 * @param {string} userID
 * @returns {Promise<boolean>} true if a record was deleted
 */
async function revokeVip(userID) {
    const result = await Vip.findOneAndDelete({ userID });
    return !!result;
}

/**
 * Get all active VIP records.
 * @returns {Promise<Array>}
 */
async function getAllActiveVips() {
    return Vip.find({ expiry: { $gt: Date.now() } }).lean();
}

module.exports = { checkVip, getVipRecord, grantVip, revokeVip, getAllActiveVips };
