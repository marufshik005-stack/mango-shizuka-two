const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "gif",
    version: "2.1",
    author: "Ew'r Saim",
    category: "media",
    role: 0,
    guide: {
      en: {
        description: "Search or get trending GIFs from Giphy",
        usage: "{pn} <search> [count] | trending [count]",
        example: "{pn} cat 3\n{pn} trending 5"
      }
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    if (args.length === 0) {
      return api.sendMessage('❌ Please provide a search query or type "trending".', threadID, messageID);
    }

    let isTrending = false;
    let query = args[0];
    let count = 1;

    // trending mode
    if (query.toLowerCase() === "trending") {
      isTrending = true;
      count = parseInt(args[1]) || 5;
    } else {
      const lastArg = args[args.length - 1];
      if (!isNaN(lastArg)) {
        count = parseInt(lastArg);
        args.pop();
      }
      query = args.join(" ");
    }

    const apiKey = 'QHv1qVaxy4LS3AmaNuUYNT9zr40ReFBI';

    try {
      const url = isTrending
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${count}&rating=g`
        : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${count}&rating=g`;

      const res = await axios.get(url);
      const data = res.data.data;

      if (!data || data.length === 0) {
        return api.sendMessage("😕 No GIFs found for your request.", threadID, messageID);
      }

      const attachments = [];

      for (let i = 0; i < data.length; i++) {
        const gifURL = data[i].images.original.url;
        const filePath = path.join(cacheDir, `giphy_${i}.gif`);
        const gifRes = await axios.get(gifURL, { responseType: "arraybuffer" });
        fs.writeFileSync(filePath, Buffer.from(gifRes.data, "binary"));
        attachments.push(fs.createReadStream(filePath));
      }

      const captions = [
        "Here's something cool! 😎",
        "Enjoy! 🎉",
        "Found these just for you 😉",
        "GIFs make life better 🤖",
        "Hope this brings a smile 😊",
        "Boom! Instant mood boost 💥",
        "GIFs are life, aren't they? 😁"
      ];
      const randomCaption = captions[Math.floor(Math.random() * captions.length)];

      await api.sendMessage({
        body: isTrending
          ? `${randomCaption}\n\n🔥 Trending GIFs (${data.length}):`
          : `${randomCaption}\n\n🎬 Here are ${data.length} result(s) for **"${query}"** 🔍`,
        attachment: attachments
      }, threadID);

      // Clean up files
      setTimeout(() => {
        attachments.forEach((_, i) => {
          const file = path.join(cacheDir, `giphy_${i}.gif`);
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
      }, 60 * 1000);

    } catch (error) {
      console.error("Giphy Error:", error);
      api.sendMessage("❌ Error fetching GIFs. Try again later.", threadID, messageID);
    }
  }
};
