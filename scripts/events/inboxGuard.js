const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../cmds/cache/inbox_config.json");

function getInboxStatus() {
  if (!fs.existsSync(configPath)) return false; // Default to OFF if not yet configured
  try {
    const data = JSON.parse(fs.readFileSync(configPath));
    return data.inboxEnabled || false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  config: {
    name: "inboxGuard",
    version: "1.0",
    author: "zisan"
  },

  onAnyEvent: async function ({ event, message, config }) {
    // Check if the message is from a Direct Message / Inbox (!event.isGroup)
    if (event.type === "message" && !event.isGroup) {
      const inboxEnabled = getInboxStatus();
      const adminList = config.ADMINBOT || [];
      const isAdmin = adminList.includes(event.senderID);

      // Block non-admins if inbox mode is turned off
      if (!inboxEnabled && !isAdmin) {
        return message.reply("The admin has currently disabled bot usage in direct messages. Please use the bot in a group chat.");
      }
    }
  }
};
