const axios = require("axios");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");

module.exports = {
  config: {
    name: "pfp",
    version: "1.0",
    author: "nexo_here", // Replace with your name
    countDown: 5, // A short cooldown to prevent spamming
    role: 0, // 0 = all users, 1 = admin
    shortDescription: "Fetch Facebook profile picture",
    longDescription: "Fetches a Facebook profile picture using UID, reply, or mention.",
    category: "UTILITY",
    guide: {
      en: "{pn} | {pn} <UID> | {pn} @mention | {pn} (reply to a message)"
    }
  },

  onStart: async function ({ message, args, event }) {
    let targetUID = event.senderID; // Default to sender's UID if no specific target

    // 1. Get UID from Reply
    if (event.messageReply) {
      targetUID = event.messageReply.senderID;
      console.log(`[PFP_DEBUG] UID from reply: ${targetUID}`);
    }
    // 2. Get UID from Mentions
    else if (Object.keys(event.mentions).length > 0) {
      targetUID = Object.keys(event.mentions)[0]; // Get the first mentioned user's UID
      console.log(`[PFP_DEBUG] UID from mention: ${targetUID}`);
    }
    // 3. Get UID from direct argument
    else if (args[0] && !isNaN(args[0])) { // Check if the first arg is a number (UID)
      targetUID = args[0];
      console.log(`[PFP_DEBUG] UID from argument: ${targetUID}`);
    }
    // If no specific UID is found, it defaults to event.senderID (the user who sent the command)

    if (!targetUID) {
      console.error("[PFP_DEBUG] No valid UID found from event, args, or reply.");
      return message.reply("❌ | Could not determine the target user's UID. Please mention, reply, or provide a UID.");
    }

    const apiUrl = `https://kaiz-apis.gleeze.com/api/facebookpfp?uid=${targetUID}&apikey=66e0cfbb-62b8-4829-90c7-c78cacc72ae2`;
    console.log(`[PFP_DEBUG] API URL: ${apiUrl}`);

    const waitingMessage = await message.reply(`⏳ | Fetching profile picture for UID: ${targetUID}`);
    console.log("[PFP_DEBUG] Sent waiting message.");

    let tempImagePath = null;

    try {
      const apiResponse = await axios.get(apiUrl, { responseType: 'arraybuffer' }); // Expecting image directly
      const imageBuffer = Buffer.from(apiResponse.data);
      console.log("[PFP_DEBUG] Image downloaded as buffer from API.");

      const timestamp = Date.now();
      // Use .jpg extension as common PFP format, though the API might return other formats
      tempImagePath = path.join(__dirname, `pfp_${targetUID}_${timestamp}.jpg`); 
      await fsp.writeFile(tempImagePath, imageBuffer);
      console.log(`[PFP_DEBUG] Image saved to temporary file: ${tempImagePath}`);

      await message.reply({
        body: `✅ | Here is the profile picture for UID: ${targetUID}`,
        attachment: fs.createReadStream(tempImagePath)
      });
      console.log("[PFP_DEBUG] Image sent successfully from temporary file.");

    } catch (error) {
      console.error("[PFP_DEBUG] Error fetching or sending PFP:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`[PFP_DEBUG] Axios Error - Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
          if (error.response.status === 400 || error.response.status === 404) {
            return message.reply(`❌ | Could not find a profile picture for UID: ${targetUID}. Please check the UID or try again.`);
          } else if (error.response.status === 401 || error.response.status === 403) {
            return message.reply("❌ | API Key unauthorized or invalid. Please check the API key.");
          } else if (error.response.status === 429) {
            return message.reply("❌ | API rate limit exceeded. Please try again later.");
          } else {
            return message.reply(`❌ | Failed to fetch profile picture. API returned status: ${error.response.status}.`);
          }
        } else if (error.request) {
          console.error("[PFP_DEBUG] Axios Error - No response received:", error.request);
          return message.reply("❌ | Failed to fetch profile picture. No response received from API.");
        } else {
          console.error("[PFP_DEBUG] Axios Error - Request setup failed:", error.message);
          return message.reply("❌ | Failed to fetch profile picture. An internal error occurred.");
        }
      } else {
        console.error("[PFP_DEBUG] Non-Axios Error:", error.message);
        return message.reply("❌ | Failed to fetch profile picture. An unexpected error occurred.");
      }
    } finally {
      if (tempImagePath) {
        try {
          await fsp.unlink(tempImagePath);
          console.log(`[PFP_DEBUG] Cleaned up temporary file: ${tempImagePath}`);
        } catch (fileError) {
          console.error(`[PFP_DEBUG] Error cleaning up temporary file ${tempImagePath}:`, fileError);
        }
      }
      console.log("[PFP_DEBUG] Command execution finished.");
    }
  }
};
