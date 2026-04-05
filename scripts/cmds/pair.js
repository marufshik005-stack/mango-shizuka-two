const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "pair",
    author: "Nyx x ariyan x fahad x saim x zisan",
    version: "2.0.0",
    category: "love",
    guide: "{pn} | {pn} @mention (VIP) | reply to a message (VIP)"
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const cacheDir = path.join(__dirname, "cache");
    const outputPath = path.join(cacheDir, `pair_${senderID}.png`);

    try {
      // --- VIP Database Setup ---
      const vipDbPath = path.join(__dirname, "../../data/vip.json");
      const vipData = fs.existsSync(vipDbPath) ? fs.readJsonSync(vipDbPath) : {};
      const isAdmin = global.GoatBot.config.adminBot.includes(senderID);
      const isVip = isAdmin || (vipData[senderID] && vipData[senderID].expiry > Date.now());

      let targetID;
      let isSpecialPair = false;

      // 1. Check for Reply Pair
      if (messageReply) {
        targetID = messageReply.senderID;
        isSpecialPair = true;
      } 
      // 2. Check for Mention Pair
      else if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        isSpecialPair = true;
      }

      // VIP Lock for Mention/Reply Pair
      if (isSpecialPair && !isVip) {
        return message.reply("👑 𝗩𝗜𝗣 𝗢𝗡𝗟𝗬!\nMatching with a specific person is a premium feature.\nType: /vip buy");
      }

      const senderData = await usersData.get(senderID);
      const senderName = senderData.name;
      const threadData = await api.getThreadInfo(threadID);
      const users = threadData.userInfo;

      // 3. Random Pair Logic (If no mention/reply)
      if (!targetID) {
        const myData = users.find((user) => user.id === senderID);
        if (!myData || !myData.gender) {
          return message.reply("⚠️ Could not determine your gender to find a random match.");
        }

        const myGender = myData.gender;
        let matchCandidates = users.filter(user => 
          (myGender === "MALE" ? user.gender === "FEMALE" : user.gender === "MALE") && 
          user.id !== senderID
        );

        if (matchCandidates.length === 0) {
          return message.reply("❌ No suitable match found in the group.");
        }
        targetID = matchCandidates[Math.floor(Math.random() * matchCandidates.length)].id;
      }

      const matchData = await usersData.get(targetID);
      const matchName = matchData.name;

      message.reply("💌 𝗠𝗮𝘁𝗰𝗵𝗺𝗮𝗸𝗶𝗻𝗴 𝗶𝗻 𝗽𝗿𝗼𝗴𝗿𝗲𝘀𝘀...");

      // --- Canvas Generation ---
      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext("2d");

      const backgrounds = [
        "https://i.imgur.com/OntEBiq.png",
        "https://i.imgur.com/IYCoZgc.jpeg",
        "https://i.imgur.com/753i3RF.jpeg"
      ];
      const randomBgUrl = backgrounds[Math.floor(Math.random() * backgrounds.length)];
      
      const background = await loadImage(randomBgUrl);
      const sIdImage = await loadImage(`https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      const pairPersonImage = await loadImage(`https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);

      ctx.drawImage(background, 0, 0, 800, 400);
      
      // Avatars (Your original coordinates)
      ctx.drawImage(sIdImage, 385, 40, 170, 170);
      ctx.drawImage(pairPersonImage, 800 - 213, 190, 180, 170);

      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

      const lovePercent = Math.floor(Math.random() * 31) + 70;
      const responseMsg = `🥰 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹 𝗣𝗮𝗶𝗿𝗶𝗻𝗴\n\n・${senderName} 🎀\n・${matchName} 🎀\n\n💌 𝗪𝗶𝘀𝗵 𝘆𝗼𝘂 𝘁𝘄𝗼 𝗵𝘂𝗻𝗱𝗿𝗲𝗱 𝘆𝗲𝗮𝗿𝘀 𝗼𝗳 𝗵𝗮𝗽𝗽𝗶𝗻𝗲𝘀𝘀 ❤️❤️\n\n𝗟𝗼𝘃𝗲 𝗣𝗲𝗿𝗰𝗲𝗻𝘁𝗮𝗴𝗲: ${lovePercent}% 💙`;

      return message.reply({
        body: responseMsg,
        attachment: fs.createReadStream(outputPath)
      }, () => {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      });

    } catch (error) {
      console.error(error);
      return message.reply("❌ Error: " + error.message);
    }
  },
};
