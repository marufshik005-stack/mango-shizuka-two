const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const mahmud = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "edit",
                aliases: ["imgedit"],
                version: "1.8",
                author: "MahMUD", 
                countDown: 10,
                role: 0,
                description: {
                        bn: "এআই এর মাধ্যমে আপনার ছবি এডিট করুন",
                        en: "Edit your image using AI prompt",
                        vi: "Chỉnh sửa hình ảnh của bạn bằng lời nhắc AI"
                },
                category: "image",
                guide: {
                        bn: '   {pn} <প্রম্পট>: ছবির রিপ্লাই দিয়ে এডিট প্রম্পট লিখুন'
                                + '\n   উদাহরণ: {pn} change hair color to red',
                        en: '   {pn} <prompt>: Reply to an image with edit instructions'
                                + '\n   Example: {pn} add sunglasses to face',
                        vi: '   {pn} <lời nhắc>: Phản hồi ảnh kèm hướng dẫn chỉnh sửa'
                                + '\n   Ví dụ: {pn} đổi màu tóc thành đỏ'
                }
        },

        langs: {
                bn: {
                        noInput: "❌ বেবি, একটি ছবিতে রিপ্লাই দিয়ে বলো কি এডিট করতে হবে! 🪄",
                        wait: "🔄 | 𝗧𝗼𝗺𝗮𝗿 𝗰𝗵𝗼𝗯𝗶 𝗲𝗱𝗶𝘁 𝗸𝗼𝗿𝗮 𝗵𝗼𝗰𝗰𝗵𝗲, 𝗲𝗸𝘁𝘂 𝗼𝗽𝗲𝗸𝗸𝗵𝗮 𝗸𝗼𝗿𝗼...",
                        success: "✅ | 𝗧𝗼𝗺𝗮𝗿 𝗲𝗱𝗶𝘁 𝗸𝗼𝗿𝗮 𝗰𝗵𝗼𝗯𝗶 𝘁𝗼𝗶𝗿𝗶: \"%1\"",
                        error: "❌ 𝗔𝗻 𝗲𝗿𝗿𝗼𝗿 𝗼𝗰𝗰𝘂𝗿𝗿𝗲𝗱: %1"
                },
                en: {
                        noInput: "❌ Baby, please reply to a photo with your prompt to edit it! 🪄",
                        wait: "🔄 | 𝗘𝗱𝗶𝘁𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗶𝗺𝗮𝗴𝗲, 𝗽𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁...",
                        success: "✅ 𝗛𝗲𝗿𝗲'𝘀 𝘆𝗼𝘂𝗿 𝗘𝗱𝗶𝘁𝗲𝗱 𝗶𝗺𝗮𝗴𝗲\n𝗣𝗿𝗼𝗺𝗽𝘁: %1",
                        error: "❌ 𝗔𝗻 𝗲𝗿𝗿𝗼𝗿 𝗼𝗰𝗰𝘂𝗿𝗿𝗲𝗱: %1"
                }
        },

        onStart: async function ({ api, event, args, message, getLang }) {
                // --- VIP CHECK (MongoDB) ---
                const { checkVip } = require("../../database/controller/vipCheck");
                const isVip = await checkVip(event.senderID);
                if (!isVip) return message.reply("👑 𝗩𝗜𝗣 𝗢𝗡𝗟𝗬!\nThis is a premium feature. Please buy a VIP card to use this command.\nType: /vip buy");
                // --- VIP CHECK END ---

                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const prompt = args.join(" ");
                const repliedImage = event.messageReply?.attachments?.[0];

                if (!prompt || !repliedImage || repliedImage.type !== "photo") {
                        return message.reply(getLang("noInput"));
                }

                const cacheDir = path.join(__dirname, "cache");
                const imgPath = path.join(cacheDir, `${Date.now()}_edit.jpg`);
                await fs.ensureDir(cacheDir);

                const waitMsg = await message.reply(getLang("wait"));

                try {
                        const baseURL = await mahmud();
                        const res = await axios.post(
                                `${baseURL}/api/edit`,
                                { prompt, imageUrl: repliedImage.url },
                                { responseType: "arraybuffer" }
                        );

                        await fs.writeFile(imgPath, Buffer.from(res.data, "binary"));

                        await message.reply({
                                body: getLang("success", prompt),
                                attachment: fs.createReadStream(imgPath)
                        });

                } catch (err) {
                        console.error("Edit Command Error:", err);
                        return message.reply(getLang("error", err.message));
                } finally {
                        if (waitMsg?.messageID) api.unsendMessage(waitMsg.messageID);
                        setTimeout(() => {
                                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                        }, 10000);
                }
        }
};
