const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "groupinfo",
    aliases: ["boxinfo"],
    version: "2.1",
    author: "Ew'r Saim",
    countDown: 5,
    role: 0,
    shortDescription: "Show stylish group info with image",
    longDescription: "Display detailed and formatted group info in Messenger",
    category: "Group Chat",
    guide: {
      en: "{p}groupinfo",
    },
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID } = event;
    const path = __dirname + `/cache/${threadID}_info.png`;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const { threadName, participantIDs, userInfo, adminIDs, messageCount, emoji, approvalMode, imageSrc } = threadInfo;

      // 1. Efficiently count genders
      const males = userInfo.filter(u => u.gender === "MALE").length;
      const females = userInfo.filter(u => u.gender === "FEMALE").length;
      const unknown = participantIDs.length - (males + females);

      // 2. Optimized Admin Info (One API call instead of a loop)
      const adminNames = [];
      const adminFetch = await api.getUserInfo(adminIDs.map(a => a.id));
      for (const id in adminFetch) {
        adminNames.push(adminFetch[id].name);
      }

      const msg = 
`╔════》 👥 GROUP INFO 《═══╗
🌐 Name: ${threadName || "Unnamed Group"}
🆔 ID: ${threadID}
💬 Emoji: ${emoji || "None"}
📩 Messages: ${messageCount.toLocaleString()}
👥 Members: ${participantIDs.length}
👨 Males: ${males}
👩 Females: ${females}
❓ Unknown: ${unknown}
🛡️ Admin Count: ${adminIDs.length}
📋 Admins:
${adminNames.map(name => `    • ${name}`).join("\n")}
🔒 Approval Mode: ${approvalMode ? "✅ On" : "❌ Off"}
╚═════════════════════════╝

🛠️ Made With by Ew'r Saim.`;

      // 3. Handling Image with Axios
      if (imageSrc) {
        const response = await axios.get(imageSrc, { responseType: 'arraybuffer' });
        fs.writeFileSync(path, Buffer.from(response.data, 'utf-8'));
        
        return api.sendMessage({
          body: msg,
          attachment: fs.createReadStream(path)
        }, threadID, () => fs.unlinkSync(path), messageID);
      } else {
        return api.sendMessage(msg, threadID, messageID);
      }

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Error fetching group info.", threadID, messageID);
    }
  },
};
