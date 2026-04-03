const { getStreamsFromAttachment } = global.utils;

module.exports = {
	config: {
		name: "notice",
		aliases: ["notif"],
		version: "1.4",
		author: "BaYjid",
		countDown: 5,
		role: 2,
		shortDescription: "Send a premium notice to all groups",
		longDescription: "This command allows the admin to send a stylish notice to all groups with user mentions, timestamp, and enhanced formatting.",
		category: "owner",
		guide: "{pn} <message>",
		envConfig: {
			delayPerGroup: 300
		}
	},

	onStart: async function ({ message, api, event, args, commandName, envCommands }) {
		const { delayPerGroup } = envCommands[commandName];

		// Check if a message is provided
		if (!args.length) return message.reply("⚠️ Please enter a message to send.");

		// Get current timestamp
		const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });

		// Mention user if replying to someone
		const userMention = event.messageReply?.senderID 
			? `👤 Mentioned User: [@${event.messageReply.senderID}]` 
			: "";

		// Stylish text format
		const stylishText = `『 𝗕𝗮𝗬𝗷𝗶𝗱 - 𝗢𝗳𝗳𝗶𝗰𝗶𝗮𝗹 𝗡𝗼𝘁𝗶𝗰𝗲 』\n━━━━━━━━━━━━━━━━━━\n📅 Date & Time: ${timestamp}\n${userMention}\n\n📢 Notice:\n${args.join(" ")}\n━━━━━━━━━━━━━━━━━━\n✅ Admin Announcement - Please Take Action`;

		// Create the message format
		const formSend = {
			body: stylishText,
			attachment: await getStreamsFromAttachment([
				...event.attachments, 
				...(event.messageReply?.attachments || [])
			])
		};

		// Retrieve all group thread IDs
		const allThreads = await api.getThreadList(1000, null, ["INBOX"]);
		const groupThreads = allThreads.filter(thread => thread.isGroup && thread.threadID !== event.threadID);
		const totalGroups = groupThreads.length;

		// If no groups are found
		if (totalGroups === 0) return message.reply("❌ No groups found to send the notice.");

		// Start sending messages
		message.reply(`⏳ Sending notices to ${totalGroups} groups...`);

		let successCount = 0, failedGroups = [];
		const pendingMessages = [];

		// Send messages to each group
		for (const { threadID } of groupThreads) {
			try {
				pendingMessages.push({ threadID, pending: api.sendMessage(formSend, threadID) });
				await new Promise(resolve => setTimeout(resolve, delayPerGroup));
			} catch (error) {
				failedGroups.push({ id: threadID, error: error.message });
			}
		}

		// Process sent messages
		for (const { threadID, pending } of pendingMessages) {
			try {
				await pending;
				successCount++;
			} catch (error) {
				failedGroups.push({ id: threadID, error: error.message });
			}
		}

		// Send final report
		const successMessage = `✅ Successfully sent notices to ${successCoun} groups.`;
		const failureMessage = failedGroups.length > 0 
			? `\n❌ Failed to send to **${failedGroups.length}** groups:\n${failedGroups.map(g => `• ${g.id} - ${g.error}`).join("\n")}` 
			: "";

		message.reply(successMessage + failureMessage);
	}
};
