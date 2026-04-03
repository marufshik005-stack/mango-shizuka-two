const fs = require("fs");
const axios = require("axios");
const googleTTS = require("google-tts-api");

module.exports = {
  config: {
    name: "say",
    aliases: ["speak", "kotha"],
    version: "1.1",
    author: "✨ Eren Yeh ✨",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Convert text to Bangla voice"
    },
    longDescription: {
      en: "Bot will speak your text in Bangla using Google TTS"
    },
    category: "media",
    guide: {
      en: "{pn} <your bangla text>"
    }
  },

  onStart: async function ({ args, message }) {
    const text = args.join(" ");
    if (!text) return message.reply("দয়া করে একটি বার্তা লিখুন!");

    try {
      const url = googleTTS.getAudioUrl(text, {
        lang: 'bn',
        slow: false,
        host: 'https://translate.google.com'
      });

      const path = `${__dirname}/voice.mp3`;
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(path, Buffer.from(res.data, "utf-8"));

      await message.reply({
        body: `🔈 বললাম: ${text}`,
        attachment: fs.createReadStream(path)
      });

      fs.unlinkSync(path);
    } catch (err) {
      console.error(err);
      message.reply("❌ ভয়েস বানাতে সমস্যা হয়েছে!");
    }
  }
};
