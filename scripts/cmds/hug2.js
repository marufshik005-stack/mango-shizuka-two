const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
    config: {
        name: "hug2",
        version: "1.0",
        author: "Ew'r Saim",
        countDown: 5,
        role: 0,
        shortDescription: "Mention someone to send a hug",
        longDescription: "Mention your love and get a hug card",
        category: "love",
        guide: "{pn} @tag"
    },

    onStart: async function ({ message, event, args }) {
        const mention = Object.keys(event.mentions);
        if (mention.length === 0) return message.reply("Please mention someone❗");
        else {
            const one = event.senderID;
            const two = mention[0];
            bal(one, two).then(path => {
                message.reply({ 
                    body: "You Are The Best🥰", 
                    attachment: fs.createReadStream(path) 
                });
            }).catch(err => {
                console.error(err);
                message.reply("Failed to create hug image.");
            });
        }
    }
};

async function bal(one, two) {
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662"; // Facebook public token

    let avone = await jimp.read(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${token}`);
    avone.circle();

    let avtwo = await jimp.read(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${token}`);
    avtwo.circle();

    let pth = "hug.png";
    let img = await jimp.read("https://i.ibb.co/r7x6qY3/FB-IMG-16843165540829870-removebg-preview.png");

    img.resize(752, 708)
       .composite(avone.resize(130, 130), 350, 380)
       .composite(avtwo.resize(130, 130), 330, 140);

    await img.writeAsync(pth);
    return pth;
          }
