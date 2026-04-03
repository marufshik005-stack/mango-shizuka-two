const axios = require("axios");
const nix = "https://apis-top.vercel.app/aryan/rbg";

module.exports = {
  config: {
    name: "removebg",
    aliases: ["rbg"],
    version: "0.0.1",
    role: 0,
    author: "ArYAN",
    category: "utility",
    cooldowns: 5,
    countDown: 5,
    guide: {
      en: "removebg reply with an image"
    }
  },
  onStart: async ({ api, event }) => {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0 || !messageReply.attachments[0].url) {
      return api.sendMessage("Please reply to an image to remove its background.", threadID, messageID);
    }

    try {
      api.setMessageReaction("⏰", messageID, () => {}, true);

      const imageUrl = messageReply.attachments[0].url;

      
      const apiResponse = await axios.get(nix, {
        params: {
          imageUrl: imageUrl
        }
      });

      const resultUrl = apiResponse.data.result;

      if (!resultUrl) {
        throw new Error("API did not return a valid result URL.");
      }

      
      const imageStreamResponse = await axios.get(resultUrl, {
        responseType: 'stream'
      });

      await api.sendMessage({
        body: "removebg successfully <🎀",
        attachment: imageStreamResponse.data
      }, threadID);

      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      let errorMessage = "An error occurred while processing the command.";
      if (e.response && e.response.data && e.response.data.error) {
          errorMessage = `API Error: ${e.response.data.error}`;
      } else if (e.message) {
          errorMessage = `Processing Error: ${e.message}`;
      }

      api.sendMessage(errorMessage, threadID, messageID);
    }
  }
};
