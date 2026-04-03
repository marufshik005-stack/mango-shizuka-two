module.exports = {
  config: {
    name: "delete",
    aliases: ["del"],
    author: "nexo_here",
    role: 2,
    category: "system"
  },

  onStart: async function ({ api, event, args, globalData }) {
    const fs = require('fs');
    const path = require('path');

    const fileName = args[0];

    if (!fileName) {
      api.sendMessage("Please provide a file name to delete.", event.threadID);
      return;
    }

    const filePath = path.join(__dirname, fileName);

    fs.unlink(filePath, async (err) => {
      if (err) {
        console.error(err);
        api.sendMessage(`❎ | Failed to delete ${fileName}.`, event.threadID);
        return;
      }
      api.sendMessage(`✅ ( ${fileName} ) Deleted successfully!`, event.threadID);
      
      // Check if GitHub sync is enabled
      try {
        const syncData = await globalData.get("gitSyncData", "data", {});
        if (syncData && syncData.config && syncData.config.enabled) {
          try {
            await syncToGitHub(fileName, 'delete', syncData.config);
          } catch (err) {
            console.log("GitHub sync error:", err.message);
          }
        }
      } catch (err) {
        console.log("Error reading sync data:", err.message);
      }
    });
  }
};

// GitHub sync function
async function syncToGitHub(fileName, action, config) {
  const GitSync = require("../../utils/gitSync.js");
  const gitSync = new GitSync(config);
  return await gitSync.syncFile(fileName, action);
}
