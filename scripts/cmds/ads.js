const DIG = require("discord-image-generation");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "ads",
    version: "1.0",
    author: "Samir B. Thakuri",
    countDown: 1,
    role: 0,
    shortDescription: "Create a brand ad using a user's avatar!",
    longDescription: "Generates an advertisement-style image using the mentioned user's profile picture.",
    category: "fun",
    guide: "{pn} [@mention]",
    envConfig: {
      deltaNext: 5
    }
  },

  onStart: async function ({ event, message, usersData }) {
    try {
      const mention = Object.keys(event.mentions);
      let uid;

      if (event.type === "message_reply") {
        uid = event.messageReply.senderID;
      } else if (mention.length > 0) {
        uid = mention[0];
      } else {
        uid = event.senderID; // fallback to sender if no tag/reply
      }

      // Get user avatar
      const url = await usersData.getAvatarUrl(uid);
      const image = await new DIG.Ad().getImage(url);

      // Save image temporarily
      const pathSave = path.join(__dirname, "tmp", `ads_${Date.now()}.png`);
      await fs.ensureDir(path.dirname(pathSave));
      fs.writeFileSync(pathSave, image);

      // Send ad-style message
      const adMessage = `🔥 Introducing the latest sensation in the market! 🛍️\nBrought to you by: @${event.mentions[uid] || "Someone special"} 🥳`;

      await message.reply({
        body: adMessage,
        attachment: fs.createReadStream(pathSave)
      }, () => fs.unlink(pathSave));

    } catch (err) {
      console.error(err);
      return message.reply("❌ Something went wrong while generating the ad image.");
    }
  }
};
