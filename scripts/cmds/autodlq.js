const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "autodl",
    version: "1.1",
    author: "Admin",
    countDown: 5,
    role: 0, // 0 means anyone can use it
    shortDescription: "Auto download videos from links",
    longDescription: "Automatically detects video links (TikTok, Facebook, Instagram) in the chat and downloads them.",
    category: "media",
    guide: "Just send a supported video link in the chat."
  },

  // If someone accidentally types "/autodl", this tells them how to use it
  onStart: async function ({ message }) {
    return message.reply("This works automatically! Just paste a TikTok, Instagram Reels, or Facebook video link in the chat, and I will download it for you.");
  },

  // onChat runs quietly in the background on every message
  onChat: async function ({ event, message }) {
    // If the message has no text, ignore it
    if (!event.body) return;

    const text = event.body;
    
    // Regex to find links inside the message
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links = text.match(urlRegex);

    if (!links) return;

    for (const url of links) {
      // Check if the link belongs to a supported video platform
      if (
        url.includes("tiktok.com") || 
        url.includes("instagram.com/reel") || 
        url.includes("instagram.com/p/") ||
        url.includes("facebook.com") || 
        url.includes("fb.watch")
      ) {
        
        try {
          // Add a small reaction or message so the user knows the bot saw it (optional)
          // message.reply("⏳ Fetching video..."); 

          /* 
            Note: We are using a popular free community API here. 
            If it stops working in the future, you just need to replace this URL 
            with another free "All-in-one downloader API" link.
          */
          const apiUrl = `https://api.joshweb.click/api/alldl?url=${encodeURIComponent(url)}`;
          const response = await axios.get(apiUrl);
          
          // Extract the video download URL from the API response
          const videoUrl = response.data.result || response.data.data || response.data.url;

          if (!videoUrl) continue;

          // Create a temporary cache folder if it doesn't exist
          const cacheDir = path.join(__dirname, "cache");
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          
          // Create a temporary file name
          const filePath = path.join(cacheDir, `video_${Date.now()}.mp4`);

          // Download the actual video file to your bot's folder
          const vidResponse = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream'
          });

          const writer = fs.createWriteStream(filePath);
          vidResponse.data.pipe(writer);

          // Once the file is fully saved, send it to the chat
          writer.on('finish', () => {
             message.reply({
               body: "📥 Auto-Downloaded Video:",
               attachment: fs.createReadStream(filePath)
             }, () => {
               // Delete the file immediately after sending so your server doesn't run out of storage
               fs.unlinkSync(filePath);
             });
          });

          writer.on('error', () => {
             fs.unlinkSync(filePath); // Clean up if it fails
          });

        } catch (err) {
           console.error("Auto-Download Error: ", err.message);
           // We intentionally do not send an error message to the chat
           // so the bot doesn't spam users if a link happens to be broken.
        }
      }
    }
  }
};
