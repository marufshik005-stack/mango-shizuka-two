const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
    config: {
        name: "marry4",
        aliases: ["marry4"],
        version: "1.0",
        author: "unknown",
        countDown: 5,
        role: 0,
        shortDescription: "get a wife",
        longDescription: "",
        category: "love",
        guide: {
            vi: "{pn} @tag",
            en: "{pn} @tag"
        }
    },

    onStart: async function ({ message, event, args }) {
        const mention = Object.keys(event.mentions);
        if (mention.length == 0) return message.reply("Please mention someone");

        // Jokhon ekjon mention kora hobe
        if (mention.length == 1) {
            const one = event.senderID;
            const two = mention[0];
            bal(one, two).then(path => {
                message.reply({
                    body: "One day with you for sure",
                    attachment: fs.createReadStream(path)
                });
            });
        }
        // Jokhon dujon ba tar beshi mention kora hobe, prothom dui ke nibo
        else {
            const one = mention[1];
            const two = mention[0];
            bal(one, two).then(path => {
                message.reply({
                    body: "One day with you for sure",
                    attachment: fs.createReadStream(path)
                });
            });
        }
    }
};


async function bal(one, two) {
    // Access token: eita Facebook er public token, tumar token diye replace korte paro jodi thake
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

    // User 1 er profile picture load kora
    let avone = await jimp.read(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${token}`);
    avone.circle();

    // User 2 er profile picture load kora
    let avtwo = await jimp.read(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${token}`);
    avtwo.circle();

    // Background image
    let img = await jimp.read("https://i.ibb.co/9ZZCSzR/ba6abadae46b5bdaa29cf6a64d762874.jpg");

    // Image resize & avatar composite kora
    img.resize(640, 535)
       .composite(avone.resize(130, 130), 200, 70)
       .composite(avtwo.resize(130, 130), 350, 150);

    // Temporary file name
    let pth = "abcd.png";

    // Save kore file path return kora
    await img.writeAsync(pth);
    return pth;
      }
