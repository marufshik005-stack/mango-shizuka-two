const mongoose = require("mongoose");

const vipSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    expiry: { type: Number, required: true },
    start: { type: Number, default: Date.now }
});

module.exports = mongoose.model("Vip", vipSchema);
