const mongoose = require("mongoose");

const teachSchema = new mongoose.Schema({
	question: {
		type: String,
		required: true,
		trim: true,
		lowercase: true
	},
	answer: {
		type: String,
		required: true,
		trim: true
	},
	threadID: {
		type: String,
		required: true
	},
	authorID: {
		type: String,
		required: true
	},
	authorName: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	},
	usageCount: {
		type: Number,
		default: 0
	},
	isActive: {
		type: Boolean,
		default: true
	},
	tags: [{
		type: String,
		lowercase: true,
		trim: true
	}],
	// For storing previous responses to prevent duplicates
	lastUsed: {
		type: Date,
		default: null
	},
	// Store message IDs that have been responded to
	respondedMessages: [{
		messageID: String,
		timestamp: Date
	}]
});

// Compound index for faster queries
teachSchema.index({ question: 1, threadID: 1 });
teachSchema.index({ threadID: 1, isActive: 1 });
teachSchema.index({ authorID: 1 });

// Text index for fuzzy search
teachSchema.index({ 
	question: "text", 
	answer: "text", 
	tags: "text" 
});

// Method to increment usage count
teachSchema.methods.incrementUsage = function() {
	this.usageCount += 1;
	this.lastUsed = new Date();
	return this.save();
};

// Method to add responded message ID
teachSchema.methods.addRespondedMessage = function(messageID) {
	// Keep only last 100 responded messages to prevent bloat
	if (this.respondedMessages.length >= 100) {
		this.respondedMessages = this.respondedMessages.slice(-50);
	}
	
	this.respondedMessages.push({
		messageID: messageID,
		timestamp: new Date()
	});
	
	return this.save();
};

// Static method to find similar questions
teachSchema.statics.findSimilar = async function(question, threadID, limit = 10) {
	const results = await this.find({
		threadID: threadID,
		isActive: true,
		$text: { $search: question }
	}, {
		score: { $meta: "textScore" }
	})
	.sort({ score: { $meta: "textScore" } })
	.limit(limit);
	
	return results;
};

// Static method to check if message was already responded to
teachSchema.statics.hasRespondedToMessage = async function(messageID, threadID) {
	const result = await this.findOne({
		threadID: threadID,
		"respondedMessages.messageID": messageID
	});
	
	return !!result;
};

// Virtual for formatted creation date
teachSchema.virtual('formattedDate').get(function() {
	return this.createdAt.toLocaleDateString();
});

// Pre-save middleware
teachSchema.pre('save', function(next) {
	if (this.isModified() && !this.isNew) {
		this.updatedAt = new Date();
	}
	next();
});

module.exports = mongoose.model("Teach", teachSchema);