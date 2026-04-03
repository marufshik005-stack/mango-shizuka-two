const axios = require("axios");

module.exports = {
  config: {
    name: "claude",
    aliases: ["cld"],
    version: "1.0",
    author: "nexo_here",
    shortDescription: "Ask Claude 3 (Haiku)",
    longDescription: "Send text or image to Claude 3 Haiku AI and get a clean response.",
    category: "ai",
    guide: "{pn}claude <your question> or reply to an image",
  },

  onStart: async function ({ api, event, args }) {
    const apikey = "66e0cfbb-62b8-4829-90c7-c78cacc72ae2";
    let query;

    // Handle image reply
    const reply = event.messageReply;
    if (
      reply &&
      reply.attachments &&
      reply.attachments.length > 0 &&
      reply.attachments[0].type === "photo"
    ) {
      query = reply.attachments[0].url;
    } else if (args.length > 0) {
      query = args.join(" ");
    } else {
      return api.sendMessage(
        "❌ Please provide a question or reply to an image.",
        event.threadID,
        event.messageID
      );
    }

    const url = `https://kaiz-apis.gleeze.com/api/claude3-haiku?ask=${encodeURIComponent(query)}&apikey=${apikey}`;

    try {
      const res = await axios.get(url);
      const responseText = res.data?.response;
      if (!responseText) {
        return api.sendMessage("⚠️ No response from Claude API.", event.threadID, event.messageID);
      }

      return api.sendMessage(responseText, event.threadID, event.messageID);
    } catch (err) {
      console.error("Claude API error:", err.message);
      return api.sendMessage("❌ Failed to reach Claude API.", event.threadID, event.messageID);
    }
  }
};
