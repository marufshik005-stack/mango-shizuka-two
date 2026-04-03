const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "aniwall",
    version: "1.0.2",
    author: "ChatGPT Updated",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Get anime wallpapers (random only)"
    },
    category: "anime",
    guide: {
      en: "{prefix}aniwall -<number_of_images_optional>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;

    // Jodi kono subcommand na deya hoy, args[0] ke "random" set koro
    if (!args[0]) {
      args[0] = "random";
    }

    const subcommand = args[0].toLowerCase();

    // Sudhu "random" accept korbo, onno kono subcommand accept korbo na
    if (subcommand !== "random") {
      return api.sendMessage(`❌ Invalid subcommand! Use: random or just "aniwall"`, threadID, messageID);
    }

    const apiCategory = "sfw/waifu";

    // Number of images default 1
    let numberImages = 1;
    if (args[1] && args[1].startsWith("-")) {
      const num = parseInt(args[1].slice(1));
      if (!isNaN(num) && num > 0) numberImages = num;
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const attachments = [];

    try {
      for(let i = 0; i < numberImages; i++) {
        const res = await axios.get(`https://api.waifu.pics/${apiCategory}`);
        const imageUrl = res.data.url;

        // Download image
        const imgPath = path.join(cacheDir, `wallpaper_${i+1}.jpg`);
        const imgData = await axios.get(imageUrl, { responseType: "arraybuffer" });
        await fs.writeFile(imgPath, imgData.data);
        attachments.push(fs.createReadStream(imgPath));
      }

      await api.sendMessage({
        body: `📌 Anime Wallpapers (random)`,
        attachment: attachments
      }, threadID, messageID);

      await fs.emptyDir(cacheDir);

    } catch (err) {
      console.error(err);
      return api.sendMessage(`❌ Error fetching wallpapers, please try again later.`, threadID, messageID);
    }
  }
};
