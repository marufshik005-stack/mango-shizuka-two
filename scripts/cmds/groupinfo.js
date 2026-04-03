const fs = require("fs-extra");
const request = require("request");

module.exports = {
  config: {
    name: "groupinfo",
    aliases: ["boxinfo"],
    version: "2.0",
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
    const threadInfo = await api.getThreadInfo(event.threadID);
    const memCount = threadInfo.participantIDs.length;
    const genderMale = [];
    const genderFemale = [];
    const genderUnknown = [];
    const adminList = [];

    // Gender count
    for (const user of threadInfo.userInfo) {
      const gender = user.gender;
      if (gender === "MALE") genderMale.push(user);
      else if (gender === "FEMALE") genderFemale.push(user);
      else genderUnknown.push(user.name);
    }

    // Admins
    for (const admin of threadInfo.adminIDs) {
      const info = await api.getUserInfo(admin.id);
      adminList.push(info[admin.id].name);
    }

    const approvalMode = threadInfo.approvalMode ? "✅ On" : "❌ Off";

    const msg = 
`╔════》 👥 GROUP INFO 《═══╗
🌐 Name: ${threadInfo.threadName}
🆔 ID: ${threadInfo.threadID}
💬 Emoji: ${threadInfo.emoji || "None"}
📩 Messages: ${threadInfo.messageCount.toLocaleString()}
👥 Members: ${memCount}
👨 Males: ${genderMale.length}
👩 Females: ${genderFemale.length}
❓ Unknown: ${genderUnknown.length}
🛡️ Admin Count: ${threadInfo.adminIDs.length}
📋 Admins:
${adminList.map(name => `   • ${name}`).join("\n")}
🔒 Approval Mode: ${approvalMode}
╚═════════════════════════╝

🛠️ Made With by Ew'r Saim.
`;

    const imagePath = `${__dirname}/cache/groupinfo.png`;

    // Download group image if available
    if (threadInfo.imageSrc) {
      request(encodeURI(threadInfo.imageSrc))
        .pipe(fs.createWriteStream(imagePath))
        .on("close", () => {
          api.sendMessage(
            {
              body: msg,
              attachment: fs.createReadStream(imagePath),
            },
            event.threadID,
            () => fs.unlinkSync(imagePath),
            event.messageID
          );
        });
    } else {
      // No image case
      api.sendMessage(
        {
          body: msg
        },
        event.threadID,
        event.messageID
      );
    }
  },
};
