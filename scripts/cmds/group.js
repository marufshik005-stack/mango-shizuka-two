module.exports = {
  config: {
    name: "groups",
    aliases: ["mygroups", "glist"],
    version: "1.0",
    author: "NEXXO",
    countDown: 10,
    role: 2, // Bot admin only
    shortDescription: "List all groups the bot is in",
    longDescription: "Displays a list of all groups where the bot is currently added.",
    category: "admin",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, message }) {
    try {
      const threads = await api.getThreadList(100, null, ["INBOX"]);
      const groupThreads = threads.filter(thread => thread.isGroup);

      if (groupThreads.length === 0) {
        return message.reply("⚠️ The bot is currently not in any groups.");
      }

      let msg = 🤖 The bot is currently in ${groupThreads.length} group(s):\n━━━━━━━━━━━━━━━━━━\n;
      let index = 1;

      for (const thread of groupThreads) {
        const name = thread.name || "Unnamed Group";
        const tid = thread.threadID;
        const members = thread.participantIDs?.length || "Unknown";
        msg += \n${index++}. ${name}\n   🆔 TID: ${tid}\n   👥 Members: ${members}\n;
      }

      msg += \n━━━━━━━━━━━━━━━━━━\nUse the TID to manage or inspect groups as needed.;

      return message.reply(msg.trim());
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to fetch group list. Please try again later.");
    }
  }
};
