const axios = require("axios");
const fs = require("fs");
const path = require("path");

const mahmhd = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "fakechat",
                aliases: ["fc", "fake"],
                version: "1.7",
                author: "MahMUD",
                countDown: 5,
                role: 0,
                description: {
                        bn: "রিপ্লাই বা মেনশনের মাধ্যমে ফেক চ্যাট ইমেজ তৈরি করুন",
                        en: "Generate fake chat image via reply, mention, or UID"
                },
                category: "fun",
                guide: {
                        bn: '   {pn} <@tag> <text>: কাউকে ট্যাগ করে ফেক মেসেজ লিখুন'
                                + '\n   {pn} <text>: কারো মেসেজে রিপ্লাই দিয়ে এটি ব্যবহার করুন',
                        en: '   {pn} <@tag> <text>: Tag someone to write fake message'
                                + '\n   {pn} <text>: Reply to someone\'s message'
                }
        },

        langs: {
                bn: {
                        noTarget: "× বেবি, দয়া করে কাউকে মেনশন দাও, রিপ্লাই করো অথবা UID দাও!",
                        noText: "× ফেক চ্যাটের জন্য কিছু টেক্সট তো লেখো!",
                        success: "🗨️ এই নাও তোমার ফেক চ্যাট: %1",
                        error: "× ফেক চ্যাট তৈরি করতে সমস্যা হয়েছে: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        noTarget: "× Baby, please reply, mention, or provide user UID!",
                        noText: "× Please provide the text for the fake chat!",
                        success: "🗨️ Fake chat generated for: %1",
                        error: "× Failed to generate chat: %1. Contact MahMUD for help."
                }
        },

        onStart: async function ({ api, event, message, args, usersData, getLang }) {
                  // --- VIP CHECK START (onStart এর ঠিক শুরুতেই থাকবে) ---
                const vipDbPath = path.join(__dirname, "../../data/vip.json");
                const vipData = fs.existsSync(vipDbPath) ? fs.readJsonSync(vipDbPath) : {};

                const isAdmin = global.GoatBot.config.adminBot.includes(event.senderID);
                const isVip = isAdmin || (vipData[event.senderID] && vipData[event.senderID].expiry > Date.now());

                if (!isVip) {
                return message.reply("👑 𝗩𝗜𝗣 𝗢𝗡𝗟𝗬!\nThis is a premium feature.\nType: /vip buy");
                }
                // --- VIP CHECK END ---
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                try {
                        let targetId;
                        let userText = args.join(" ").trim();

                        if (event.messageReply) {
                                targetId = event.messageReply.senderID;
                        } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                                targetId = Object.keys(event.mentions)[0];
                                const mentionName = event.mentions[targetId];
                                userText = args.join(" ").replace(new RegExp(`@?${mentionName}`, "gi"), "").trim();
                        } else if (args.length > 0 && /^\d+$/.test(args[0])) {
                                targetId = args[0];
                                userText = args.slice(1).join(" ").trim();
                        }

                        if (!targetId) return message.reply(getLang("noTarget"));
                        if (!userText) return message.reply(getLang("noText"));

                        let userName = "Unknown";
                        try {
                                userName = (await usersData.getName(targetId)) || targetId;
                        } catch {
                                userName = targetId;
                        }

                        const baseApi = await mahmhd();
                        const apiUrl = `${baseApi}/api/fakechat?id=${targetId}&name=${encodeURIComponent(userName)}&text=${encodeURIComponent(userText)}`;

                        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
                        const cacheDir = path.join(__dirname, "cache");
                        const filePath = path.join(cacheDir, `fakechat_${Date.now()}.png`);

                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
                        fs.writeFileSync(filePath, Buffer.from(response.data));

                        await message.reply({
                                body: getLang("success", userName),
                                attachment: fs.createReadStream(filePath)
                        });

                        setTimeout(() => {
                                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
                        }, 5000);

                } catch (err) {
                        console.error(err);
                        return message.reply(getLang("error", err.message));
                }
        }
};
