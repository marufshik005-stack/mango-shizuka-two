const DIG = require("discord-image-generation");
const fs = require("fs-extra");
const Jimp = require("jimp");
const path = require("path");

module.exports = {
  config: {
    name: "trash",
    version: "2.0",
    author: "ChatGPT x Ew'rSaim",
    countDown: 2,
    role: 0,
    shortDescription: "Put someone in the trash 🗑️",
    longDescription: "Make a joke image by putting someone's avatar in a trash can",
    category: "fun",
    guide: "{pn} [@mention or reply]"
  },

  onStart: async function ({ event, message, usersData }) {
    const mention = Object.keys(event.mentions);
    let uid;

    // Determine target user
    if (event.type === "message_reply") {
      uid = event.messageReply.senderID;
    } else if (mention.length > 0) {
      uid = mention[0];
    } else {
      uid = event.senderID; // fallback to sender
    }

    try {
      // Get user avatar
      const avatarUrl = await usersData.getAvatarUrl(uid);
      const trashImageBuffer = await new DIG.Trash().getImage(avatarUrl);

      // Load image into Jimp for editing
      const image = await Jimp.read(trashImageBuffer);

      // Load small font for watermark
      const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

      // Add "Owner: Ew'r Saim" in bottom right
      image.print(fontSmall, 0, image.getHeight() - 20, {
        text: "Owner: Ew'r Saim",
        alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT
      }, image.getWidth() - 10, 20);

      // Save final image
      const filePath = path.join(__dirname, "..", "..", "tmp", `trash_${uid}.png`);
      await image.writeAsync(filePath);

      const name = await usersData.getName(uid);
      const caption = `🗑️ ${name} has officially been trashed. 😂`;

      await message.reply(
        {
          body: caption,
          attachment: fs.createReadStream(filePath)
        },
        () => fs.unlinkSync(filePath)
      );
    } catch (error) {
      console.error("Trash command error:", error);
      message.reply("❌ Couldn't generate trash image.");
    }
  }
};
