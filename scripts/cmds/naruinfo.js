const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "naruinfo",
    aliases: [],
    author: "Vex_Kshitiz",
    version: "1.1",
    cooldowns: 5,
    role: 0,
    shortDescription: "Naruto character info",
    longDescription: "Get information about Naruto anime character.",
    category: "anime",
    guide: "{p}naruinfo {character name}",
  },

  onStart: async function ({ api, event, args, message }) {
    const characterName = args.join(" ");
    if (!characterName) {
      return message.reply("Please provide a Naruto character name.");
    }

    // Check author validity
    async function checkAuthor(authorName) {
      try {
        const response = await axios.get("https://author-check.vercel.app/name");
        return response.data.name === authorName;
      } catch (error) {
        console.error("Author check failed:", error);
        return false;
      }
    }

    const isAuthorValid = await checkAuthor(module.exports.config.author);
    if (!isAuthorValid) {
      return message.reply("Author changer alert! This command belongs to Vex_Kshitiz.");
    }

    // Build API URL
    const apiUrl = `https://character-info-kshitiz.vercel.app/naruto?character=${encodeURIComponent(characterName)}`;

    try {
      const response = await axios.get(apiUrl);
      const { title, description, image, info } = response.data;

      const infoText = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      const messageBody = `🌟 Name: ${title}\n\n📝 Description: ${description}\n\n📌 Info:\n${infoText}`;

      // Make sure cache folder exists
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }

      // Safe filename
      const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const tempImagePath = path.join(cacheDir, `${Date.now()}_${safeTitle}.jpg`);

      // Image downloader
      async function downloadImage(url, filepath) {
        const response = await axios.get(url, { responseType: "stream" });
        return new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(filepath);
          response.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      }

      await downloadImage(image, tempImagePath);

      const stream = fs.createReadStream(tempImagePath);
      message.reply({
        body: messageBody,
        attachment: stream,
      }, () => {
        fs.unlink(tempImagePath, err => {
          if (err) console.error("Image delete error:", err);
        });
      });

    } catch (error) {
      console.error("Main error:", error.message || error);
      message.reply("❌ Could not fetch character info. Maybe the name is incorrect?");
    }
  }
};
