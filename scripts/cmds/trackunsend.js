module.exports = {
    config: {
        name: "trackunsend",
        aliases: ["tu", "unsendtrack"],
        version: "1.0",
        author: "Assistant",
        countDown: 5,
        role: 0, // Accessible to all, but checked via custom logic
        description: {
            vi: "Bật/tắt tính năng theo dõi tin nhắn bị gỡ bỏ",
            en: "Enable/disable unsent message tracking"
        },
        category: "box chat",
        guide: {
            vi: "{pn} [on/off] - Bật hoặc tắt theo dõi tin nhắn bị gỡ bỏ",
            en: "{pn} [on/off] - Enable or disable unsent message tracking"
        }
    },

    langs: {
        vi: {
            turnedOn: "✅ Đã bật tính năng theo dõi tin nhắn bị gỡ bỏ!\nBot sẽ hiển thị nội dung của tin nhắn khi có người gỡ bỏ.",
            turnedOff: "❌ Đã tắt tính năng theo dõi tin nhắn bị gỡ bỏ!",
            currentStatus: "📊 Trạng thái hiện tại: %1",
            invalidOption: "❌ Tùy chọn không hợp lệ! Sử dụng: on hoặc off",
            onlyAdmin: "❌ Chỉ admin bot và VIP mới có thể sử dụng lệnh này!"
        },
        en: {
            turnedOn: "✅ Unsent message tracking enabled!\nBot will show content of messages when someone unsends them.",
            turnedOff: "❌ Unsent message tracking disabled!",
            currentStatus: "📊 Current status: %1",
            invalidOption: "❌ Invalid option! Use: on or off",
            onlyAdmin: "❌ Only bot admins and VIPs can use this command!"
        }
    },

    onStart: async function ({ message, event, args, threadsData, getLang, api }) {
        const { threadID, senderID } = event;
        
        // Get thread data
        const threadData = await threadsData.get(threadID);
        
        // Check if user is bot admin or VIP
        const isBotAdmin = global.GoatBot.config.adminBot.includes(senderID);
        const isVip = global.GoatBot.config.vipUsers.includes(senderID);
        
        // Only bot admins or VIPs can use this command
        if (!isBotAdmin && !isVip) {
            return message.reply(getLang("onlyAdmin"));
        }

        const option = args[0]?.toLowerCase();
        
        if (!option) {
            const currentStatus = threadData.settings?.trackUnsend ? "ON" : "OFF";
            return message.reply(getLang("currentStatus", currentStatus));
        }

        if (option === "on" || option === "enable" || option === "1") {
            await threadsData.set(threadID, {
                settings: {
                    ...(threadData.settings || {}),
                    trackUnsend: true
                }
            });
            return message.reply(getLang("turnedOn"));
        }
        
        if (option === "off" || option === "disable" || option === "0") {
            await threadsData.set(threadID, {
                settings: {
                    ...(threadData.settings || {}),
                    trackUnsend: false
                }
            });
            return message.reply(getLang("turnedOff"));
        }

        return message.reply(getLang("invalidOption"));
    }
};