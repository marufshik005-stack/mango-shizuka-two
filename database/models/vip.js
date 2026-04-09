const mongoose = require("mongoose");

const vipSchema = new mongoose.Schema({
    userID:   { type: String, required: true, unique: true, index: true },
    expiry:   { type: Number, required: true, index: true },
    start:    { type: Number, default: Date.now }
}, { timestamps: true });

vipSchema.index({ expiry: 1 });

module.exports = mongoose.model("Vip", vipSchema);
