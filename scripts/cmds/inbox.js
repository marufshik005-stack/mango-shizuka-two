const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "cache", "inbox_config.json");

function getInboxStatus() {
  if (!fs.existsSync(configPath)) return false; 
  try {
    const data = JSON.parse(fs.readFileSync(configPath));
    return data.inboxEnabled || false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  config: {
    name: "inbox",
    version: "2.0",
    author: "zisan",
    countDown: 5,
    role: 2, 
    shortDescription: "Toggle inbox bot usage",
    longDescription: "Enable or disable bot usage in direct messages for standard users.",
    category: "owner",
    guide: "{pn} [on/off]"
  },

  onStart: async function ({ message, args }) {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const state = args[0] ? args[0].toLowerCase() : "";

    if (state !== "on" && state !== "off") {
      return message.reply("⚠️ Usage: Type `inbox on` to enable inbox usage, or `inbox off` to disable it.");
    }

    const isEnabled = state === "on";
    fs.writeFileSync(configPath, JSON.stringify({ inboxEnabled: isEnabled }, null, 2));

    return message.reply(`✅ Inbox bot usage is now ${isEnabled ? "ENABLED" : "DISABLED"} for standard users.`);
  },

  // onChat runs quietly in the background on every text message
  onChat: async function ({ event, message }) {
    if (!event.body) return;

    // Check if the message is in a Direct Message (Inbox)
    // Goat-Bot API identifies DMs when isGroup is false or threadID equals senderID
    const isGroup = event.isGroup || (String(event.threadID) !== String(event.senderID));
    
    if (!isGroup) {
      const inboxEnabled = getInboxStatus();
      
      // Pull admin list directly from Goat-Bot's global config
      const adminList = global.GoatBot.config.adminBot || global.GoatBot.config.ADMINBOT || [];
      const isAdmin = adminList.includes(event.senderID);

      if (!inboxEnabled && !isAdmin) {
        const prefix = global.GoatBot.config.prefix || "/";
        
        // Only warn them if they are actually trying to use a command (avoids spamming)
        if (event.body.startsWith(prefix)) {
           message.reply("🚫 The admin has disabled bot usage in direct messages. Please use the bot in a group chat.");
        }
      }
    }
  }
};
