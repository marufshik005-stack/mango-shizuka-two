const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createReadStream, existsSync } = require('fs');

const userDataFilePath = path.join(__dirname, 'ffquiz.json');

module.exports = {
  config: {
    name: "ffquiz",
    aliases: [],
    version: "1.3",
    author: "Vex_Kshitiz",
    role: 0,
    shortDescription: "Guess the Free Fire character",
    longDescription: "Guess the Free Fire character based on the image",
    category: "game",
    guide: {
      en: "{p}ffquiz | {p}ffquiz top"
    }
  },

  onStart: async function ({ event, message, usersData, api, args }) {
    try {
      if (!event || !message) return;

      // Author validation
      const isAuthorValid = await this.checkAuthor(this.config.author);
      if (!isAuthorValid) {
        return message.reply("Author changer alert! This command belongs to Vex_Kshitiz.");
      }

      // Show leaderboard
      if (args.length === 1 && args[0] === "top") {
        return await this.showTopPlayers({ message, usersData });
      }

      // Fetch character data
      const characterData = await this.fetchCharacterData();
      if (!characterData) return message.reply("Error fetching character data. Please try again later.");

      const { image, fullName, firstName } = characterData;

      // Download image
      const imageStream = await this.downloadImage(image);
      if (!imageStream) return message.reply("Failed to download image. Please try again.");

      // Send quiz image + message
      const replyMsg = await message.reply({
        body: "🧠 Guess the Free Fire character!",
        attachment: imageStream
      });

      // Save reply info for answer checking
      global.GoatBot.onReply.set(replyMsg.messageID, {
        commandName: this.config.name,
        messageID: replyMsg.messageID,
        correctAnswer: [fullName.toLowerCase(), firstName.toLowerCase()],
        senderID: event.senderID
      });

      // Auto unsend timeout off, will unsend after reply

    } catch (error) {
      console.error("Start error:", error);
      message.reply("An error occurred. Please try again later.");
    }
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    try {
      if (!event || !message || !Reply) return;

      const userAnswer = event.body.trim().toLowerCase();
      const correctAnswers = Reply.correctAnswer;

      if (correctAnswers.includes(userAnswer)) {
        await this.addCoins(Reply.senderID, 1000, usersData);
        await message.reply("🎉 Correct! You earned 1000 coins.");
      } else {
        await message.reply(`❌ Wrong! Correct answer was: ${correctAnswers[1]}`);
      }

      // Debug logs for unsend
      console.log("Unsending user reply messageID:", event.messageID);
      console.log("Unsending quiz messageID:", Reply.messageID);

      // Unsend reply message + quiz message after 3 seconds so user can see bot reply
      setTimeout(async () => {
        try {
          await message.unsend(event.messageID);    // user reply message
          await message.unsend(Reply.messageID);    // quiz image message
          console.log("Messages unsent successfully");
        } catch (err) {
          console.error("Error unsending messages:", err);
        }
      }, 3000);

    } catch (error) {
      console.error("Reply error:", error);
    }
  },

  fetchCharacterData: async function () {
    try {
      const response = await axios.get('https://ff-quiz-kshitiz.vercel.app/kshitiz');
      return response.data;
    } catch (error) {
      console.error("Fetch character error:", error);
      return null;
    }
  },

  downloadImage: async function (imageUrl) {
    try {
      const timestamp = Date.now();
      const fileName = `ff_character_${timestamp}.jpg`;
      const cacheDir = path.join(__dirname, 'cache');

      if (!existsSync(cacheDir)) {
        await fs.mkdir(cacheDir, { recursive: true });
      }

      const filePath = path.join(cacheDir, fileName);
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

      if (!response.data || response.data.length === 0) return null;

      await fs.writeFile(filePath, response.data, 'binary');
      return createReadStream(filePath);
    } catch (error) {
      console.error("Image download error:", error);
      return null;
    }
  },

  addCoins: async function (userID, amount, usersData) {
    try {
      let userData = await usersData.get(userID);
      if (!userData) userData = { money: 0 };
      userData.money = (userData.money || 0) + amount;
      await usersData.set(userID, userData);
    } catch (error) {
      console.error("Add coins error:", error);
    }
  },

  showTopPlayers: async function ({ message, usersData }) {
    try {
      const allUsers = await usersData.getAll();
      const topUsers = Object.entries(allUsers)
        .map(([userID, data]) => ({
          userID,
          money: data.money || 0
        }))
        .sort((a, b) => b.money - a.money)
        .slice(0, 5);

      if (!topUsers.length) return message.reply("No leaderboard data yet.");

      const topList = await Promise.all(topUsers.map(async (user, i) => {
        const name = await usersData.getName(user.userID) || "Unknown";
        return `${i + 1}. ${name} (${user.money} coins)`;
      }));

      return message.reply("🏆 Top 5 Players:\n\n" + topList.join("\n"));
    } catch (error) {
      console.error("Leaderboard error:", error);
      message.reply("Failed to fetch leaderboard.");
    }
  },

  checkAuthor: async function (authorName) {
    try {
      const response = await axios.get('https://author-check.vercel.app/name');
      return response.data.name === authorName;
    } catch (error) {
      console.error("Author check error:", error);
      return false;
    }
  }
};
