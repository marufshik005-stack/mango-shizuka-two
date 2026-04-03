const { GoatWrapper } = require("fca-liane-utils");
const Canvas = require("canvas");
const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "time",
    aliases: [],
    version: "1.0",
    author: "Ew'r Saim",
    role: 0,
    category: "utility",
    guide: "{p}time"
  },

  // 🔤 Convert normal text to Unicode Math Bold (𝐀𝐛𝐜 𝟏𝟐𝟑)
  toMathBold: function (text) {
    const offset = {
      upper: 0x1D400 - 65,
      lower: 0x1D41A - 97,
      number: 0x1D7CE - 48
    };

    return text.split("").map(char => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(offset.upper + code);
      if (code >= 97 && code <= 122) return String.fromCodePoint(offset.lower + code);
      if (code >= 48 && code <= 57) return String.fromCodePoint(offset.number + code);
      return char;
    }).join("");
  },

  onStart: async function ({ api, event, message }) {
    try {
      const now = moment().tz("Asia/Dhaka");
      const time = now.format("hh:mm A");
      const date = now.format("dddd, D MMMM, YYYY");

      const imageUrl = "https://files.catbox.moe/ldvtg3.jpg"; // 🐱 তোমার catbox image link
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

      const bgImage = await Canvas.loadImage(response.data);
      const canvas = Canvas.createCanvas(bgImage.width, bgImage.height);
      const ctx = canvas.getContext("2d");

      // 🔤 Convert text to Unicode Bold
      const boldTime = module.exports.toMathBold(time);
      const boldDate = module.exports.toMathBold(date);

      // 🎨 Text style adjustments
      ctx.fillStyle = "#FF1744"; // Deep neon red (adjusted color)
      ctx.font = "50px Sans-serif"; // Updated font size to 50px
      ctx.textAlign = "center";
      ctx.strokeStyle = "black"; // black outline for text
      ctx.lineWidth = 3; // thicker stroke for better contrast

      // 🖼️ Draw background
      ctx.drawImage(bgImage, 0, 0);

      // 🕓 Draw time (adjusted positioning)
      const timeYPosition = canvas.height / 2 - 40; // Move the time slightly up
      ctx.strokeText(boldTime, canvas.width / 2, timeYPosition);
      ctx.fillText(boldTime, canvas.width / 2, timeYPosition);

      // 📅 Draw date (adjusted positioning)
      const dateYPosition = canvas.height / 2 + 40; // Move the date slightly down
      ctx.strokeText(boldDate, canvas.width / 2, dateYPosition);
      ctx.fillText(boldDate, canvas.width / 2, dateYPosition);

      // 💾 Save image
      const filePath = path.join(__dirname, "timeimage.png");
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(filePath, buffer);

      // 📤 Send image
      api.sendMessage(
        {
          body: "> 🇧🇩 Time in Bangladesh:",
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        () => fs.unlinkSync(filePath),
        event.messageID
      );
    } catch (err) {
      console.error(err);
      api.sendMessage("❌ an error occurred!", event.threadID, event.messageID);
    }
  }
};

// Wrapping the module to apply no prefix
const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });
