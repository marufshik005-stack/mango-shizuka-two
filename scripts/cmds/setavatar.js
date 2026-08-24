const axios = require("axios");
const fs = require("fs");

module.exports = {
  config: {
    name: "setavatar",
    version: "1.0",
    author: "zisan",
    countDown: 5,
    role: 2, // role 2 restricts this to Bot Admins only
    shortDescription: "Change the bot's profile picture",
    longDescription: "Update the bot's Facebook profile picture by replying to an image.",
    category: "owner",
    guide: "{pn} [reply to an image]"
  },

  onStart: async function ({ api, event, message }) {
    // Check if the user replied to a message
    if (event.type !== "message_reply") {
      return message.reply("Please reply to an image to set it as the bot's new profile picture.");
    }

    const attachments = event.messageReply.attachments;
    
    // Check if the replied message actually contains a valid photo
    if (!attachments || attachments.length === 0 || attachments[0].type !== "photo") {
      return message.reply("The message you replied to must contain a valid image.");
    }

    const imgUrl = attachments[0].url;
    // Create a temporary path to save the downloaded image
    const imgPath = __dirname + `/cache/new_avatar_${Date.now()}.jpg`;

    try {
      // Download the image from the chat
      const imgRes = await axios.get(imgUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(imgPath);
      
      imgRes.data.pipe(writer);

      writer.on("finish", () => {
        // Pass the downloaded image to the Facebook API
        api.changeAvatar(fs.createReadStream(imgPath), "", null, (err) => {
          if (err) {
            fs.unlinkSync(imgPath); // Clean up the failed file
            return message.reply("An error occurred while communicating with Facebook's API.");
          }
          
          message.reply("Successfully updated the bot's profile picture!");
          fs.unlinkSync(imgPath); // Clean up the temp file after success
        });
      });

    } catch (error) {
      console.error(error);
      message.reply("Failed to download the image from the chat.");
    }
  }
};
