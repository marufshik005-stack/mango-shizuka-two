const Jimp = require("jimp");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
    config: {
        name: "kiss2",
        aliases: ["kiss2"],
        version: "1.0",
        author: "Ew'r Saim",
        countDown: 5,
        role: 0,
        shortDescription: "KISS",
        longDescription: "Send a kiss image with 2 people.",
        category: "fun",
        guide: "{pn} tag or reply"
    },

    onStart: async function ({ api, message, event, usersData }) {
        const uid = event.senderID;
        const mention = Object.keys(event.mentions);
        const uid1 = Object.keys(event.mentions)[0];
        const uid2 = event.messageReply ? event.messageReply.senderID : null;
        const uids = uid1 || uid2;

        if (!uids) return message.reply("😘 | Tag or reply to someone you want to kiss.");

        let two = uid, one = uids;

        if (mention.length === 2) {
            one = mention[1];
            two = mention[0];
        }

        try {
            // Avatar URLs
            const avatarURL1 = await usersData.getAvatarUrl(one);
            const avatarURL2 = await usersData.getAvatarUrl(two);

            if (!avatarURL1 || !avatarURL2) {
                return message.reply("Couldn't fetch user avatars.");
            }

            // Download avatars
            const avatar1 = await Jimp.read((await axios({ url: avatarURL1, responseType: "arraybuffer" })).data);
            const avatar2 = await Jimp.read((await axios({ url: avatarURL2, responseType: "arraybuffer" })).data);

            // Background image
            const background = await Jimp.read("https://i.imgur.com/XwmDBf2.png");
            background.resize(495, 619);

            // Resize and circle avatars
            avatar1.resize(110, 110).circle();
            avatar2.resize(110, 110).circle();

            // Composite avatars on background
            background.composite(avatar1, 100, 130);
            background.composite(avatar2, 250, 100);

            // Ensure tmp folder exists
            const tmpPath = path.join(__dirname, "tmp");
            await fs.ensureDir(tmpPath);

            // Save final image
            const imagePath = path.join(tmpPath, `${one}_${two}_kiss.png`);
            await background.writeAsync(imagePath);

            // Get usernames
            const userName1 = (await usersData.getName(one)) || "Someone";
            const userName2 = (await usersData.getName(two)) || "Someone";

            // Romantic message
            const romanticText = `💋 ${userName2} just gave a sweet kiss to ${userName1} 😘\nLove is in the air! ❤️🔥`;

            // Send image and message
            message.reply({
                body: romanticText,
                attachment: fs.createReadStream(imagePath)
            }, () => fs.unlinkSync(imagePath));

        } catch (error) {
            console.error(error);
            message.reply("Something went wrong while generating the image.");
        }
    }
};
