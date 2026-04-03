const { MongoClient } = require('mongodb');
const stringSimilarity = require('string-similarity');

module.exports = {
	config: {
		name: "teach",
		version: "2.0.0",
		author: "zisan",
		countDown: 5,
		role: 0,
		description: "Teach the bot to respond to messages with AI learning capabilities",
		category: "ai",
		guide: {
			en: `
📚 TEACH COMMAND GUIDE:

🔹 Add new response:
{pn} <question> | <answer>

🔹 Remove response:
{pn} remove <question>

🔹 List responses:
{pn} list [page]

🔹 Search responses:
{pn} search <keyword>

🔹 Statistics:
{pn} stats

Examples:
• {pn} hello | Hi there! How can I help you?
• {pn} remove hello
• {pn} list 1
• {pn} search greeting`
		}
	},

	langs: {
		en: {
			added: "✅ Successfully taught! Question: \"%1\" will now be answered with: \"%2\"",
			removed: "🗑️ Removed response for: \"%1\"",
			notFound: "❌ No response found for: \"%1\"",
			listEmpty: "📝 No responses found in this thread.",
			listTitle: "📚 Taught Responses (Page %1/%2):",
			listItem: "%1. Q: \"%2\" → A: \"%3\" (Used: %4 times)",
			statsTitle: "📊 Teaching Statistics:",
			statsContent: "📝 Total responses: %1\n👤 Your contributions: %2\n🔥 Most popular: \"%3\" (used %4 times)\n📅 Latest addition: %5",
			invalidFormat: "❌ Invalid format! Use: teach <question> | <answer>",
			duplicate: "⚠️ This response already exists! Use a different question or remove the old one first.",
			searchResults: "🔍 Search results for \"%1\":",
			noSearchResults: "❌ No results found for: \"%1\""
		}
	},

	onStart: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
		const { threadID, messageID, senderID } = event;
		const input = args.join(" ").trim();

		if (!input) {
			return message.reply(this.config.guide.en);
		}

		try {
			// Initialize MongoDB connection
			const TeachModel = await this.getTeachModel();
			const userData = await usersData.get(senderID);
			const userName = userData?.name || "Unknown User";

			// Handle different commands
			if (input.toLowerCase().startsWith("remove ")) {
				return await this.handleRemove(input.slice(7), threadID, senderID, message, getLang, TeachModel);
			}

			if (input.toLowerCase().startsWith("list")) {
				const page = parseInt(args[1]) || 1;
				return await this.handleList(page, threadID, message, getLang, TeachModel);
			}

			if (input.toLowerCase().startsWith("search ")) {
				return await this.handleSearch(input.slice(7), threadID, message, getLang, TeachModel);
			}

			if (input.toLowerCase() === "stats") {
				return await this.handleStats(threadID, senderID, message, getLang, TeachModel);
			}

			// Handle add response
			if (input.includes(" | ")) {
				return await this.handleAdd(input, threadID, senderID, userName, message, getLang, TeachModel);
			}

			return message.reply(getLang("invalidFormat"));

		} catch (error) {
			console.error("Teach command error:", error);
			return message.reply("❌ An error occurred while processing your request. Please try again.");
		}
	},

	handleAdd: async function (input, threadID, senderID, userName, message, getLang, TeachModel) {
		const [question, answer] = input.split(" | ").map(s => s.trim());

		if (!question || !answer) {
			return message.reply(getLang("invalidFormat"));
		}

		// Check if exact question already exists
		const existing = await TeachModel.findOne({
			question: question.toLowerCase(),
			threadID: threadID,
			isActive: true
		});

		if (existing) {
			return message.reply(getLang("duplicate"));
		}

		// Create new teach entry
		const newTeach = new TeachModel({
			question: question.toLowerCase(),
			answer: answer,
			threadID: threadID,
			authorID: senderID,
			authorName: userName
		});

		await newTeach.save();
		return message.reply(getLang("added", question, answer));
	},

	handleRemove: async function (question, threadID, senderID, message, getLang, TeachModel) {
		const result = await TeachModel.findOneAndUpdate(
			{
				question: question.toLowerCase(),
				threadID: threadID,
				isActive: true
			},
			{ isActive: false },
			{ new: true }
		);

		if (!result) {
			return message.reply(getLang("notFound", question));
		}

		return message.reply(getLang("removed", question));
	},

	handleList: async function (page, threadID, message, getLang, TeachModel) {
		const limit = 10;
		const skip = (page - 1) * limit;

		const total = await TeachModel.countDocuments({
			threadID: threadID,
			isActive: true
		});

		if (total === 0) {
			return message.reply(getLang("listEmpty"));
		}

		const totalPages = Math.ceil(total / limit);
		const responses = await TeachModel.find({
			threadID: threadID,
			isActive: true
		})
		.sort({ usageCount: -1, createdAt: -1 })
		.skip(skip)
		.limit(limit);

		let replyText = getLang("listTitle", page, totalPages) + "\n\n";
		
		responses.forEach((item, index) => {
			const num = skip + index + 1;
			replyText += getLang("listItem", num, item.question, 
				item.answer.length > 50 ? item.answer.substring(0, 50) + "..." : item.answer, 
				item.usageCount) + "\n";
		});

		return message.reply(replyText);
	},

	handleSearch: async function (keyword, threadID, message, getLang, TeachModel) {
		const results = await TeachModel.find({
			threadID: threadID,
			isActive: true,
			$or: [
				{ question: { $regex: keyword, $options: 'i' } },
				{ answer: { $regex: keyword, $options: 'i' } },
				{ tags: { $in: [keyword.toLowerCase()] } }
			]
		})
		.sort({ usageCount: -1 })
		.limit(10);

		if (results.length === 0) {
			return message.reply(getLang("noSearchResults", keyword));
		}

		let replyText = getLang("searchResults", keyword) + "\n\n";
		
		results.forEach((item, index) => {
			replyText += `${index + 1}. Q: "${item.question}" → A: "${
				item.answer.length > 50 ? item.answer.substring(0, 50) + "..." : item.answer
			}" (Used: ${item.usageCount} times)\n`;
		});

		return message.reply(replyText);
	},

	handleStats: async function (threadID, senderID, message, getLang, TeachModel) {
		const totalCount = await TeachModel.countDocuments({
			threadID: threadID,
			isActive: true
		});

		const userCount = await TeachModel.countDocuments({
			threadID: threadID,
			authorID: senderID,
			isActive: true
		});

		const mostPopular = await TeachModel.findOne({
			threadID: threadID,
			isActive: true
		}).sort({ usageCount: -1 });

		const latest = await TeachModel.findOne({
			threadID: threadID,
			isActive: true
		}).sort({ createdAt: -1 });

		const statsContent = getLang("statsContent", 
			totalCount,
			userCount,
			mostPopular ? mostPopular.question : "None",
			mostPopular ? mostPopular.usageCount : 0,
			latest ? latest.formattedDate : "None"
		);

		return message.reply(getLang("statsTitle") + "\n\n" + statsContent);
	},

	getTeachModel: async function () {
		const mongoose = require('mongoose');
		
		// Check if model already exists
		if (mongoose.models.Teach) {
			return mongoose.models.Teach;
		}
		
		// Load the model
		return require('../../database/models/teachModel.js');
	},

	// Smart response system - called by onChat event
	onChat: async function ({ api, event, threadsData }) {
		const { threadID, messageID, body, senderID } = event;
		
		// Skip if no message body or if it's a command
		if (!body || body.startsWith('.') || body.startsWith('/') || body.startsWith('!')) {
			return;
		}

		// Skip bot's own messages
		if (senderID === api.getCurrentUserID()) {
			return;
		}

		// Only auto-reply when user is replying to bot's message
		if (!event.messageReply || event.messageReply.senderID !== api.getCurrentUserID()) {
			return;
		}

		try {
			const TeachModel = await this.getTeachModel();
			
			// Check if we already responded to this message
			const alreadyResponded = await TeachModel.hasRespondedToMessage(messageID, threadID);
			if (alreadyResponded) {
				return;
			}

			// Find response using smart matching
			const response = await this.findBestResponse(body, threadID, TeachModel);
			
			if (response) {
				// Send the response
				const sentMessage = await api.sendMessage(response.answer, threadID, messageID);
				
				// Mark as used and add to responded messages
				await response.incrementUsage();
				await response.addRespondedMessage(messageID);
				
				console.log(`[TEACH] Responded to "${body}" with "${response.answer}"`);
			}

		} catch (error) {
			console.error("Teach onChat error:", error);
		}
	},

	findBestResponse: async function (userMessage, threadID, TeachModel) {
		const cleanMessage = userMessage.toLowerCase().trim();
		
		// Step 1: Try exact match first
		const exactMatch = await TeachModel.findOne({
			question: cleanMessage,
			threadID: threadID,
			isActive: true
		});
		
		if (exactMatch) {
			return exactMatch;
		}

		// Step 2: Try partial matches
		const partialMatches = await TeachModel.find({
			threadID: threadID,
			isActive: true,
			question: { $regex: this.escapeRegex(cleanMessage), $options: 'i' }
		});

		if (partialMatches.length > 0) {
			// Return random match if multiple
			return partialMatches[Math.floor(Math.random() * partialMatches.length)];
		}

		// Step 3: Try reverse partial matches (user message contains the question)
		const reverseMatches = await TeachModel.find({
			threadID: threadID,
			isActive: true
		});

		const matchingReverse = reverseMatches.filter(item => 
			cleanMessage.includes(item.question) || item.question.includes(cleanMessage)
		);

		if (matchingReverse.length > 0) {
			return matchingReverse[Math.floor(Math.random() * matchingReverse.length)];
		}

		// Step 4: Use string similarity for closest match
		const allResponses = await TeachModel.find({
			threadID: threadID,
			isActive: true
		});

		if (allResponses.length === 0) {
			return null;
		}

		// Calculate similarity scores
		const similarities = allResponses.map(response => ({
			response: response,
			similarity: stringSimilarity.compareTwoStrings(cleanMessage, response.question)
		}));

		// Sort by similarity and get best matches
		similarities.sort((a, b) => b.similarity - a.similarity);

		// Only return if similarity is above threshold (30%)
		if (similarities[0].similarity >= 0.3) {
			// If multiple responses have similar high scores, pick randomly
			const topSimilarity = similarities[0].similarity;
			const topMatches = similarities.filter(s => s.similarity >= topSimilarity - 0.1);
			
			const randomMatch = topMatches[Math.floor(Math.random() * topMatches.length)];
			return randomMatch.response;
		}

		return null;
	},

	escapeRegex: function (string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
};