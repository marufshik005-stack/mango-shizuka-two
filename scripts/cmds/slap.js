const axios = require("axios");
const fs = require("fs");
const path = require("path");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
  return base.data.mahmud;
};

module.exports = {
        config: {
                name: "slap",
                aliases: ["thappor"],
                version: "1.7",
                author: "MahMUD",
                countDown: 10,
                role: 0,
                description: {
                        bn: "কাউকে থাপ্পড় মারার ছবি তৈরি করুন",
                        en: "Create a slap image of someone"
                },
                category: "fun",
                guide: {
                        bn: '   {pn} <@tag>: কাউকে ট্যাগ করে থাপ্পড় মারুন'
                                + '\n   {pn} <uid>: UID এর মাধ্যমে থাপ্পড় মারুন'
                                + '\n   (অথবা কারো মেসেজে রিপ্লাই দিয়ে এটি ব্যবহার করুন)',
                        en: '   {pn} <@tag>: Slap a tagged user'
                                + '\n   {pn} <uid>: Slap by UID'
                                + '\n   (Or reply to someone\'s message)'
                }
        },

        langs: {
                bn: {
                        noTarget: "× বেবি, কাকে থাপ্পড় মারবে তাকে মেনশন দাও বা রিপ্লাই করো!",
                        success: "এই নাও থাপ্পড়! একদম গাল লাল হয়ে গেছে 💥",
                        error: "× থাপ্পড় মারতে গিয়ে সমস্যা হয়েছে: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        noTarget: "× Baby, mention or reply to someone to slap!",
                        success: "Here's a slap! 💥",
                        error: "× Failed to slap: %1. Contact MahMUD for help."
                }
        },

        onStart: async function ({ api, message, args, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const { senderID, messageReply, mentions } = event;
                let id2;

                if (messageReply) {
                        id2 = messageReply.senderID;
                } else if (Object.keys(mentions).length > 0) {
                        id2 = Object.keys(mentions)[0];
                } else if (args[0] && !isNaN(args[0])) {
                        id2 = args[0];
                }

                if (!id2) return message.reply(getLang("noTarget"));

                try {
                        const baseUrl = await baseApiUrl();
                        const url = `${baseUrl}/api/dig?type=slap&user=${senderID}&user2=${id2}`;

                        const response = await axios.get(url, { responseType: "arraybuffer" });
                        const cachePath = path.join(__dirname, "cache", `slap_${id2}.png`);
                        
                        if (!fs.existsSync(path.join(__dirname, "cache"))) {
                                fs.mkdirSync(path.join(__dirname, "cache"));
                        }

                        fs.writeFileSync(cachePath, Buffer.from(response.data));

                        await message.reply({
                                body: getLang("success"),
                                attachment: fs.createReadStream(cachePath)
                        });

                        fs.unlinkSync(cachePath);
                } catch (err) {
                        console.error("Error in slap command:", err);
                        return message.reply(getLang("error", err.message));
                }
        }
};

