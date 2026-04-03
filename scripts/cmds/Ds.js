const axios = require("axios");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");

module.exports = {
  config: {
    name: "deepseek",
    aliases: ["ds"],
    version: "1.5", // Updated version
    author: "nexo_here",
    countDown: 15, // Cooldown for API calls
    role: 0,
    shortDescription: "Chat with DeepSeek AI (text or image)",
    longDescription: "Send a question or image to DeepSeek v3 API and receive a clean AI response.",
    category: "ai",
    guide: "{pn}deepseek <your question> or reply to an image.",
  },

  onStart: async function ({ api, event, args, message }) {
    const apikey = "66e0cfbb-62b8-4829-90c7-c78cacc72ae2";
    let query;
    let isImageQuery = false;

    // Check if replying to an image
    const repliedMessage = event.messageReply; // Renamed to repliedMessage for clarity

    if (
      repliedMessage &&
      repliedMessage.attachments &&
      repliedMessage.attachments.length > 0 &&
      repliedMessage.attachments[0].type === "photo"
    ) {
      query = repliedMessage.attachments[0].url;
      isImageQuery = true;
      console.log(`[DEEPSEEK_DEBUG] onStart: Initial image query from reply: ${query}`);
    } else if (args.length > 0) {
      query = args.join(" ");
      console.log(`[DEEPSEEK_DEBUG] onStart: Initial text query from command: "${query}"`);
    } else {
      console.log("[DEEPSEEK_DEBUG] onStart: No query provided in command or image reply.");
      return message.reply("❌ Please provide a question or reply to an image.");
    }

    const url = `https://kaiz-apis.gleeze.com/api/deepseek-v3?ask=${encodeURIComponent(query)}&apikey=${apikey}`;
    console.log(`[DEEPSEEK_DEBUG] onStart: API URL: ${url}`);

    try {
      const res = await axios.get(url);
      const responseText = res.data?.response;
      if (!responseText) {
        console.error("[DEEPSEEK_DEBUG] onStart: No 'response' field in API data:", res.data);
        return message.reply("⚠️ No response received from DeepSeek.");
      }

      // Send the initial response and set up onReply context
      api.sendMessage({ body: responseText }, event.threadID, (err, info) => {
        if (err) {
          console.error("[DEEPSEEK_DEBUG] onStart: Error sending message:", err);
          return message.reply("❌ Failed to send response message.");
        }
        
        // This is the crucial part, mimicking the hanime command's onReply setup
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name, // The command name
          messageID: info.messageID, // The ID of the bot's sent message
          author: event.senderID,   // The ID of the user who started the conversation
          // We don't need to store the previous query unless DeepSeek API requires conversation history
          // For kaiz-apis, each 'ask' is a fresh query.
        });
        console.log(`[DEEPSEEK_DEBUG] onStart: Response sent. Context set for messageID: ${info.messageID}`);
      });
      
    } catch (err) {
      console.error("DeepSeek API Error (onStart):", err.message);
      if (axios.isAxiosError(err) && err.response) {
          console.error("DeepSeek API Response Data (Error - onStart):", err.response.data);
      }
      return message.reply("❌ Failed to contact DeepSeek API.");
    }
  },

  onReply: async function ({ api, event, message, Reply }) {
    console.log(`[DEEPSEEK_DEBUG] onReply: Function triggered.`);
    console.log(`[DEEPSEEK_DEBUG] onReply: Event body: "${event.body}"`); // Log the user's reply text
    console.log(`[DEEPSEEK_DEBUG] onReply: Event senderID: ${event.senderID}`);
    console.log(`[DEEPSEEK_DEBUG] onReply: Reply context object:`, Reply); // Log the context passed by GoatBot

    // Check if this reply is for the correct command and original author
    if (Reply.commandName !== this.config.name) {
      console.log(`[DEEPSEEK_DEBUG] onReply: Ignoring reply for different command: ${Reply.commandName}`);
      return;
    }
    if (event.senderID !== Reply.author) { // Reply.author holds the original senderID
      console.log(`[DEEPSEEK_DEBUG] onReply: Reply from unauthorized user: ${event.senderID}`);
      return message.reply("This conversation is only for the user who started it.");
    }

    let newQuery;
    const repliedWithAttachment = event.attachments && event.attachments.length > 0 && event.attachments[0].type === "photo";

    if (repliedWithAttachment) {
        newQuery = event.attachments[0].url;
        console.log(`[DEEPSEEK_DEBUG] onReply: Follow-up image query: ${newQuery}`);
    } else if (event.body) {
        newQuery = event.body;
        console.log(`[DEEPSEEK_DEBUG] onReply: Follow-up text query: "${newQuery}"`);
    } else {
        console.log("[DEEPSEEK_DEBUG] onReply: No valid query found in follow-up message.");
        return message.reply("❌ Please provide a text question or reply with an image for follow-up.");
    }
    
    const apikey = "66e0cfbb-62b8-4829-90c7-c78cacc72ae2";
    const url = `https://kaiz-apis.gleeze.com/api/deepseek-v3?ask=${encodeURIComponent(newQuery)}&apikey=${apikey}`;
    console.log(`[DEEPSEEK_DEBUG] onReply: API URL: ${url}`);

    try {
      const res = await axios.get(url);
      const responseText = res.data?.response;

      if (!responseText) {
        console.error("[DEEPSEEK_DEBUG] onReply: No 'response' field in API data:", res.data);
        return message.reply("⚠️ No response received from DeepSeek for your follow-up.");
      }

      // Send the follow-up response
      api.sendMessage({ body: responseText }, event.threadID, (err, info) => {
        if (err) {
          console.error("[DEEPSEEK_DEBUG] onReply: Error sending follow-up message:", err);
          return message.reply("❌ Failed to send follow-up response.");
        }
        // IMPORTANT: Delete the old context and set new context for the latest message
        // This ensures the conversation continues with the new bot message.
        global.GoatBot.onReply.delete(Reply.messageID); // Delete old context
        global.GoatBot.onReply.set(info.messageID, { // Set new context
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
        });
        console.log(`[DEEPSEEK_DEBUG] onReply: Follow-up response sent. Context updated for messageID: ${info.messageID}`);
      });

    } catch (err) {
      console.error("DeepSeek API Error (onReply):", err.message);
      if (axios.isAxiosError(err) && err.response) {
          console.error("DeepSeek API Response Data (Error - onReply):", err.response.data);
      }
      return message.reply("❌ Failed to contact DeepSeek API for your follow-up.");
    }
  }
};
