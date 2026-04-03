const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
    config: {
        name: "marry2",
        aliases: ["m2"],
        version: "1.2",
        author: "AceGun",
        countDown: 5,
        role: 0,
        shortDescription: "Get a virtual wife/husband ❤️",
        longDescription: "Mention one person and marry them 😍",
        category: "love",
        guide: "{pn} @partner"
    },

    onStart: async function ({ message, event, args }) {
        const mention = Object.keys(event.mentions);

        if (mention.length === 0) {
            return message.reply("Please mention someone to marry!");
        }

        if (mention.length > 2) {
            return message.reply("Mention only one or two people, not more!");
        }

        let one, two;
        if (mention.length === 1) {
            one = event.senderID;
            two = mention[0];
        } else {
            one = mention[1];
            two = mention[0];
        }

        try {
            const imagePath = await generateMarriageImage(one, two);
            const messages = [
                "Love you Babe🥰❤️",
                "Just Married 💍",
                "Couple Goals 💑",
                "Forever Yours 💘",
                "Amar Tomay Valobasha 🥹❤️"
            ];
            const text = messages[Math.floor(Math.random() * messages.length)];

            await message.reply({
                body: `「 ${text} 」`,
                attachment: fs.createReadStream(imagePath)
            });

            // Auto-delete temp image after 5 seconds
            setTimeout(() => {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Failed to delete temp image:", err);
                });
            }, 5000);

        } catch (err) {
            console.error(err);
            return message.reply("Something went wrong! 😢");
        }
    }
};

async function generateMarriageImage(one, two) {
    const accessToken = process.env.FB_TOKEN || '6628568379|c1e620fa708a1d5696fb991c1bde5662';
    const url1 = `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${accessToken}`;
    const url2 = `https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${accessToken}`;
    const bgUrl = "https://i.ibb.co/5TwSHpP/Guardian-Place-full-1484178.jpg";

    const pth = `marry2_${Date.now()}_${Math.floor(Math.random() * 9999)}.png`;

    try {
        const avone = await jimp.read(url1);
        avone.circle();

        const avtwo = await jimp.read(url2);
        avtwo.circle();

        const bg = await jimp.read(bgUrl);
        bg.resize(600, 338)
            .composite(avone.resize(75, 75), 262, 0)
            .composite(avtwo.resize(80, 80), 350, 69);

        await bg.writeAsync(pth);
        return pth;

    } catch (err) {
        throw new Error("Image processing failed");
    }
      }
