const mongoose = require("mongoose");

const economySchema = new mongoose.Schema({
	userID: {
		type: String,
		required: true,
		unique: true
	},
	bankBalance: {
		type: Number,
		default: 0
	},
	investments: {
		type: Map,
		of: {
			amount: Number,
			price: Number,
			date: Date,
			type: String
		},
		default: {}
	},
	transactions: [{
		type: {
			type: String,
			enum: ['deposit', 'withdraw', 'transfer_sent', 'transfer_received', 'investment', 'dividend', 'daily_reward', 'bank_interest']
		},
		amount: Number,
		description: String,
		date: {
			type: Date,
			default: Date.now
		},
		relatedUser: String
	}],
	lastDailyReward: {
		type: String,
		default: ""
	},
	bankLevel: {
		type: Number,
		default: 1
	},
	investmentLevel: {
		type: Number,
		default: 1
	}
}, {
	timestamps: true
});

module.exports = mongoose.model("Economy", economySchema);
