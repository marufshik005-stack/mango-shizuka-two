module.exports = {
  config: {
    name: "nokia",
    aliases: ["nokia"],
    version: "1.0",
    author: "kshitiz",
    shortDescription: "Make a Nokia meme from a user's avatar",
    longDescription: "Generate a funny Nokia-styled meme using the avatar of a mentioned or replied user",
    category: "fun",
    guide: "{pn} @mention or reply to a message"
  },

  async onStart({ api, event, usersData }) {
    try {
      const mention = Object.keys(event.mentions);
      let imageLink = "";

      if (mention.length === 0) {
        // Replied user
        if (event.type === "message_reply") {
          imageLink = await usersData.getAvatarUrl(event.messageReply.senderID);
        } else {
          return api.sendMessage("❌ Please mention or reply to someone.", event.threadID, event.messageID);
        }
      } else {
        // Mentioned user
        const mentionedUserID = mention[0];
        imageLink = await usersData.getAvatarUrl(mentionedUserID);
      }

      const gifURL = `https://api.popcat.xyz/nokia?image=${encodeURIComponent(imageLink)}`;

      const message = {
        body: "📱 This is real Nokia power!",
        attachment: [await global.utils.getStreamFromURL(gifURL)]
      };

      api.sendMessage(message, event.threadID, event.messageID);
    } catch (err) {
      console.error(err);
      api.sendMessage("⚠️ Something went wrong. Try again later.", event.threadID, event.messageID);
    }
  }
};
