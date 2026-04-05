const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "daily",
    version: "1.3",
    author: "NTKhang & Zisan",
    countDown: 5,
    role: 0,
    description: {
      en: "Receive your daily 10,000 coins"
    },
    category: "game",
    guide: {
      en: "{pn}: Claim daily reward"
    }
  },

  langs: {
    en: {
      alreadyReceived: "⚠️ ʏᴏᴜ ʜᴀᴠᴇ ᴀʟʀᴇᴀᴅʏ ʀᴇᴄᴇɪᴠᴇᴅ ʏᴏᴜʀ ᴅᴀɪʟʏ ɢɪꜰᴛ ᴛᴏᴅᴀʏ!",
      received: "✨ ᴄᴏɴɢʀᴀᴛᴜʟᴀᴛɪᴏɴs!\n🎁 ʏᴏᴜ ʜᴀᴠᴇ ʀᴇᴄᴇɪᴠᴇᴅ: $10,000 ᴄᴏɪɴs\n🌟 ᴇxᴘᴇʀɪᴇɴᴄᴇ ᴘᴏɪɴᴛs: +%1 ᴇxᴘ"
    }
  },

  onStart: async function ({ message, event, usersData, getLang }) {
    const { senderID } = event;
    const userData = await usersData.get(senderID);
    
    // Set daily rewards
    const dailyCoin = 10000;
    const dailyExp = 100;

    // Timezone set to Dhaka
    const tz = "Asia/Dhaka";
    const dateTime = moment.tz(tz).format("DD/MM/YYYY");

    // Check if already claimed
    if (userData.data.lastTimeGetReward === dateTime) {
      return message.reply(getLang("alreadyReceived"));
    }

    // Update user data
    userData.data.lastTimeGetReward = dateTime;
    
    await usersData.set(senderID, {
      money: (userData.money || 0) + dailyCoin,
      exp: (userData.exp || 0) + dailyExp,
      data: userData.data
    });

    return message.reply(getLang("received", dailyExp));
  }
};
