const GitSync = require("../../utils/gitSync.js");

module.exports = {
  config: {
    name: "gitsync",
    version: "1.0",
    author: "Assistant",
    countDown: 5,
    role: 2,
    description: {
      en: "Toggle GitHub synchronization for cmd install/delete operations"
    },
    category: "owner",
    guide: {
      en: "   {pn} on: Enable GitHub sync (commands will be committed to GitHub)\n"
        + "   {pn} off: Disable GitHub sync (commands will be temporary)\n"
        + "   {pn} status: Check current sync status\n"
        + "   {pn} config: Setup GitHub repository details\n"
        + "   {pn} test: Test GitHub connection"
    }
  },

  langs: {
    en: {
      turnedOn: "✅ | GitHub sync is now ON\nCommands installed/deleted will be automatically committed to GitHub",
      turnedOff: "✅ | GitHub sync is now OFF\nCommands installed/deleted will be temporary (no GitHub changes)",
      statusOn: "📊 | GitHub Sync Status: ON ✅\nRepository: %1/%2\nChanges will be committed to GitHub",
      statusOff: "📊 | GitHub Sync Status: OFF ❌\nChanges are temporary only",
      configSuccess: "✅ | GitHub configuration saved successfully!\nRepo: %1/%2",
      missingConfig: "⚠️ | Please configure GitHub settings first!\nUse: gitsync config",
      missingTokenOrRepo: "⚠️ | Missing GitHub credentials!\nPlease reply with:\nGITHUB_TOKEN=your_token\nREPO_OWNER=owner\nREPO_NAME=repo_name",
      invalidCommand: "⚠️ | Invalid command. Use: gitsync on/off/status/config/test",
      configHelp: "📝 | Reply to this message with your GitHub configuration in this format:\nGITHUB_TOKEN=your_personal_access_token\nREPO_OWNER=your_github_username\nREPO_NAME=your_repo_name\nGIT_USER_EMAIL=your@email.com\nGIT_USER_NAME=Your Name",
      testSuccess: "✅ | GitHub connection successful!\nConnected to: %1",
      testFailed: "❌ | GitHub connection failed!\nError: %1"
    }
  },

  onStart: async ({ args, message, event, commandName, getLang, threadsData, usersData, dashBoardData, globalData }) => {
    const command = (args[0] || "").toLowerCase();
    
    // Load or initialize global sync data
    let syncData = await globalData.get("gitSyncData", "data", {}) || {};
    
    if (!syncData.config) {
      syncData.config = {
        enabled: false,
        token: "",
        repoOwner: "",
        repoName: "",
        userEmail: "",
        userName: ""
      };
    }

    switch (command) {
      case "on": {
        if (!syncData.config.token || !syncData.config.repoOwner || !syncData.config.repoName) {
          return message.reply(getLang("missingConfig"), (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              messageID: info.messageID,
              author: event.senderID,
              type: "config"
            });
          });
        }

        syncData.config.enabled = true;
        await globalData.set("gitSyncData", syncData, "data");
        message.reply(getLang("turnedOn"));
        break;
      }

      case "test": {
        if (!syncData.config.token || !syncData.config.repoOwner || !syncData.config.repoName) {
          return message.reply(getLang("missingConfig"));
        }

        const gitSync = new GitSync(syncData.config);
        const result = await gitSync.testConnection();
        
        if (result.success) {
          message.reply(getLang("testSuccess", result.repo));
        } else {
          message.reply(getLang("testFailed", result.error));
        }
        break;
      }

      case "off": {
        syncData.config.enabled = false;
        await globalData.set("gitSyncData", syncData, "data");
        message.reply(getLang("turnedOff"));
        break;
      }

      case "status": {
        if (syncData.config.enabled) {
          message.reply(getLang("statusOn", syncData.config.repoOwner, syncData.config.repoName));
        } else {
          message.reply(getLang("statusOff"));
        }
        break;
      }

      case "config": {
        message.reply(getLang("configHelp"), (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            type: "config"
          });
        });
        break;
      }

      default: {
        message.reply(getLang("invalidCommand"));
        break;
      }
    }
  },

  onReply: async ({ Reply, message, event, globalData, getLang }) => {
    const { author, type } = Reply;
    
    if (event.senderID != author) return;
    
    if (type === "config") {
      const configText = event.body.trim();
      const lines = configText.split('\n');
      const config = {};
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        if (key && value) {
          const normalizedKey = key.trim().toLowerCase();
          if (normalizedKey === 'github_token') config.token = value;
          else if (normalizedKey === 'repo_owner') config.repoOwner = value;
          else if (normalizedKey === 'repo_name') config.repoName = value;
          else if (normalizedKey === 'git_user_email') config.userEmail = value;
          else if (normalizedKey === 'git_user_name') config.userName = value;
        }
      }
      
      if (!config.token || !config.repoOwner || !config.repoName) {
        return message.reply(getLang("missingTokenOrRepo"));
      }
      
      // Save to global data
      let syncData = await globalData.get("gitSyncData", "data", {}) || {};
      syncData.config = {
        enabled: false,
        token: config.token,
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        userEmail: config.userEmail || "bot@example.com",
        userName: config.userName || "Bot"
      };
      
      await globalData.set("gitSyncData", syncData, "data");
      
      message.reply(getLang("configSuccess", config.repoOwner, config.repoName));
      message.unsend(Reply.messageID);
    }
  }
};
