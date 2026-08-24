const fs = require("fs");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");
const configPath = path.join(cacheDir, "inbox_config.json");

module.exports = {
  config: {
    name: "inbox",
    version: "1.0",
    author: "zisan",
    countDown: 5,
    role: 2, // Restricted to Bot Admins only
    shortDescription: "Toggle inbox bot usage",
    longDescription: "Enable or disable bot usage in direct messages for standard users.",
    category: "owner",
    guide: "{pn} [on/off]"
  },

  onStart: async function ({ message, args }) {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const state = args[0] ? args[0].toLowerCase() : "";

    if (state !== "on" && state !== "off") {
      return message.reply("Usage: Type `/inbox on` to enable inbox usage, or `/inbox off` to disable it.");
    }

    const isEnabled = state === "on";
    fs.writeFileSync(configPath, JSON.stringify({ inboxEnabled: isEnabled }, null, 2));

    if (isEnabled) {
      return message.reply("Inbox bot usage is now ENABLED for everyone!");
    } else {
      return message.reply("Inbox bot usage is now DISABLED for standard users.");
    }
  }
};
