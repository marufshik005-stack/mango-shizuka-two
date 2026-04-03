const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
  config: {
    name: "spiderman",
    aliases: ["spiderman"],
    version: "1.1",
    author: "Unknown",
    countDown: 5,
    role: 0,
    shortDescription: "spiderman meme with you and a friend",
    longDescription: "Create a spiderman pointing meme using Facebook avatars",
    category: "fun",
    guide: "{pn} @mention or reply"
  },

  onStart: async function ({ message, event }) {
    const mention = Object.keys(event.mentions);
    const sender = event.senderID;

    const captions = [
      "Bro thinks he’s me 😂🕷️",
      "Same suit, same drama 🤡",
      "When the multiverse gets confused 🌀",
      "Me arguing with myself at 3AM 💀",
      "When your clone copies your homework 📝",
      "Guess who's the original? 👀",
      "This town ain't big enough for both of us 😤",
      "Spideyception intensifies 🤯",
      "Hey! That's my face! 😳",
      "Multiverse of madness starter pack 🕸️"
    ];

    const randomCaption = captions[Math.floor(Math.random() * captions.length)];

    let user1, user2;

    if (mention.length === 0) {
      if (event.type === "message_reply") {
        user1 = sender;
        user2 = event.messageReply.senderID;
      } else {
        return message.reply("❌ Please mention someone or reply to their message.");
      }
    } else if (mention.length === 1) {
      user1 = sender;
      user2 = mention[0];
    } else {
      user1 = mention[1];
      user2 = mention[0];
    }

    try {
      const imagePath = await createSpiderMeme(user1, user2);
      return message.reply({
        body: randomCaption,
        attachment: fs.createReadStream(imagePath)
      }, () => fs.unlinkSync(imagePath));
    } catch (e) {
      console.error(e);
      return message.reply("❌ Failed to generate the meme.");
    }
  }
};

async function createSpiderMeme(one, two) {
  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

  let av1 = await jimp.read(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${token}`);
  let av2 = await jimp.read(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${token}`);

  av1.circle();
  av2.circle();

  const bg = await jimp.read("https://i.imgur.com/AIizK0f.jpeg");
  bg.resize(1440, 1080);

  bg.composite(av1.resize(170, 170), 325, 110);
  bg.composite(av2.resize(170, 170), 1000, 95);

  const outPath = `spiderman_${one}_${two}.png`;
  await bg.writeAsync(outPath);
  return outPath;
  }
