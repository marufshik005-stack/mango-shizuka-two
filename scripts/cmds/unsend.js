module.exports = {
        config: {
                name: "unsend",
                aliases: ["u", "uns", "r"],
                version: "1.2",
                author: "NTKhang",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Gỡ tin nhắn của bot",
                        en: "Unsend bot's message"
                },
                category: "box chat",
                guide: {
                        vi: "reply tin nhắn muốn gỡ của bot và gọi lệnh {pn}",
                        en: "reply the message you want to unsend and call the command {pn}"
                }
        },

        langs: {
                vi: {
                        syntaxError: "Vui lòng reply tin nhắn muốn gỡ của bot"
                },
                en: {
                        syntaxError: "Please reply the message you want to unsend"
                }
        },

        onStart: async function ({ message, event, api, getLang, threadsData }) {
                if (!event.messageReply || event.messageReply.senderID != api.getCurrentUserID())
                        return message.reply(getLang("syntaxError"));

                const { threadID, senderID } = event;
                const messageID = event.messageReply.messageID;

                // Check if this is an unsend notification message
                const unsendTracker = global.GoatBot.events.get("unsendTracker");
                if (unsendTracker && unsendTracker.messageCache) {
                        const cachedMessage = unsendTracker.messageCache.get(messageID);
                        
                        if (cachedMessage && cachedMessage.isUnsendNotification) {
                                // Only allow bot admins and VIPs to unsend notification messages
                                const isBotAdmin = global.GoatBot.config.adminBot.includes(senderID);
                                const isVip = global.GoatBot.config.vipUsers.includes(senderID);
                                
                                if (!isBotAdmin && !isVip) {
                                        return message.reply("❌ Only bot admins and VIPs can unsend this notification!");
                                }
                        }
                }

                message.unsend(messageID);
        }
};
