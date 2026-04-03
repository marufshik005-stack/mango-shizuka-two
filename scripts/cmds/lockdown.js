module.exports = {
	config: {
		name: "lockdown",
		aliases: ["lock"],
		version: "1.0",
		author: "Your Name",
		countDown: 5,
		role: 2,
		description: "Lock the group so only bot owner can send messages",
		category: "owner",
		guide: {
			en: "   {pn} on: enable lockdown mode (only bot owner can send messages)"
				+ "\n   {pn} off: disable lockdown mode"
				+ "\n   {pn}: check lockdown status"
		}
	},

	langs: {
		en: {
			lockdownEnabled: "🔒 Lockdown mode enabled! Only bot owner can send messages in this group.",
			lockdownDisabled: "🔓 Lockdown mode disabled! Everyone can send messages now.",
			lockdownStatus: "🔒 Lockdown Status: %1",
			enabled: "Enabled ✅",
			disabled: "Disabled ❌",
			invalidArgs: "❌ Invalid argument. Use 'on' or 'off'"
		}
	},

	onStart: async function ({ message, args, threadsData, event, getLang }) {
		const threadID = event.threadID;
		
		if (!args[0]) {
			const currentStatus = await threadsData.get(threadID, "data.lockdown") || false;
			const statusText = currentStatus ? getLang("enabled") : getLang("disabled");
			return message.reply(getLang("lockdownStatus", statusText));
		}

		if (args[0].toLowerCase() === "on") {
			await threadsData.set(threadID, true, "data.lockdown");
			return message.reply(getLang("lockdownEnabled"));
		}
		else if (args[0].toLowerCase() === "off") {
			await threadsData.set(threadID, false, "data.lockdown");
			return message.reply(getLang("lockdownDisabled"));
		}
		else {
			return message.reply(getLang("invalidArgs"));
		}
	}
};
