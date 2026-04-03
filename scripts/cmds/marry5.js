const jimp = require("jimp");
const fs = require("fs");

module.exports = {
  config: {
    name: "marry5",
    aliases: ["marryv5"],
    version: "1.1",
    author: "Unknown",
    countDown: 5,
    role: 0,
    shortDescription: "Get a fun couple image with mentioned users",
    longDescription: "",
    category: "love",
    guide: {
      vi: "{pn} @tag",
      en: "{pn} @tag"
    }
  },

  onStart: async function ({ message, event, args }) {
    const mention = Object.keys(event.mentions);
    if (mention.length === 0) return message.reply("❌ Please mention someone to marry!");

    let user1 = event.senderID;
    let user2 = mention.length === 1 ? mention[0] : mention[1]; // jodi 2 mention hoy, second user nibo

    try {
      const imagePath = await createMarryImage(user1, user2);
      message.reply({
        body: "💖 We will live happily together! 😘",
        attachment: fs.createReadStream(imagePath)
      });

      // Image ta porer jonno clean korte parba
      setTimeout(() => fs.unlinkSync(imagePath), 60000);
    } catch (err) {
      console.error(err);
      message.reply("❌ Something went wrong while creating the image.");
    }
  }
};

async function createMarryImage(userID1, userID2) {
  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662"; // Fb graph token (official token change korte hobe jodi lage)
  
  const url1 = `https://graph.facebook.com/${userID1}/picture?width=512&height=512&access_token=${token}`;
  const url2 = `https://graph.facebook.com/${userID2}/picture?width=512&height=512&access_token=${token}`;

  const avatar1 = await jimp.read(url1);
  await avatar1.circle();

  const avatar2 = await jimp.read(url2);
  await avatar2.circle();

  const baseImage = await jimp.read("https://i.imgur.com/FV2iQTr.jpg");
  baseImage.resize(486, 640);

  baseImage
    .composite(avatar1.resize(90, 90), 215, 120)
    .composite(avatar2.resize(90, 90), 130, 180);

  const outPath = `marry_${userID1}_${userID2}.png`;
  await baseImage.writeAsync(outPath);
  return outPath;
  }
