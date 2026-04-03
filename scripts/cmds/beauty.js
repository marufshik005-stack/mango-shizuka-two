const Jimp = require("jimp");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "beauty",
    version: "3.0",
    author: "Ew'r Saim",
    role: 0,
    category: "fun",
    guide: {
      en: "Get beauty score with image. Use: beauty [@mention]"
    }
  },

  onStart: async function ({ event, message, usersData }) {
    // Support for mention system
    const mention = Object.keys(event.mentions);
    const uid = mention.length > 0 ? mention[0] : event.senderID;
    const name = await usersData.getName(uid);
    const percent = Math.floor(Math.random() * 101);

    try {
      // Read avatar
      const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const avatar = await Jimp.read(avatarUrl);
      avatar.resize(512, 512);

      // Dark overlay for text
      const overlay = new Jimp(512, 70, "#00000099");
      avatar.composite(overlay, 0, 442);

      // Load main white font
      const fontMain = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
      const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

      // Draw shadowed/outlined text for beauty %
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx !== 0 || dy !== 0) {
            avatar.print(fontMain, dx, 455 + dy, {
              text: `💖 ${percent}% BEAUTIFUL 💖`,
              alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, 512, 50);
          }
        }
      }

      // Main centered white text
      avatar.print(fontMain, 0, 455, {
        text: `💖 ${percent}% BEAUTIFUL 💖`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, 512, 50);

      // Owner credit text in bottom-right corner
      avatar.print(fontSmall, 0, 492, {
        text: "Owner: Ewr Saim",
        alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT
      }, 500, 20);

      // Save to tmp path
      const savePath = path.join(__dirname, "..", "..", "tmp", `beauty_${uid}.png`);
      await fs.ensureDir(path.dirname(savePath));
      await avatar.writeAsync(savePath);

      // Dynamic message
      const msg =
        percent === 100
          ? `🌟 ${name}, you're 100% beautiful! Perfect! 💎`
          : percent >= 80
          ? `🔥 ${name} is looking 🔥 at ${percent}% beauty!`
          : percent >= 50
          ? `😊 ${name}'s beauty rating is ${percent}% – not bad!`
          : `😅 ${name} got only ${percent}% beauty... still special tho!`;

      // Send message with image
      await message.reply(
        {
          body: msg,
          attachment: fs.createReadStream(savePath)
        },
        () => fs.unlinkSync(savePath)
      );
    } catch (err) {
      console.error(err);
      return message.reply("❌ Couldn't generate beauty image.");
    }
  }
};
