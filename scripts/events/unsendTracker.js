const { getTime } = global.utils;

module.exports = {
    config: {
        name: "unsendTracker",
        version: "1.0",
        author: "Assistant",
        envConfig: {
            allow: true
        },
        category: "events"
    },

    langs: {
        vi: {
            unsendDetected: "📤 Tin nhắn đã bị gỡ bỏ!\n👤 Người gỡ: %1\n💬 Nội dung: %2\n⏰ Thời gian: %3",
            noContent: "[Không có nội dung văn bản]",
            onlyAdminCanUnsend: "❌ Chỉ admin bot và VIP mới có thể gỡ thông báo này!"
        },
        en: {
            unsendDetected: "📤 Message was unsent!\n👤 User: %1\n💬 Content: %2\n⏰ Time: %3",
            noContent: "[No text content]",
            onlyAdminCanUnsend: "❌ Only bot admins and VIPs can unsend this notification!"
        }
    },

    // Store recent messages to track when they get unsent
    messageCache: new Map(),

    onStart: async function ({ threadsData, usersData, event, api, getLang }) {
        const { threadID, messageID, body, senderID, attachments } = event;

        // Cache all incoming messages
        if (event.type === "message") {
            const messageData = {
                senderID,
                body: body || "",
                attachments: attachments || [],
                timestamp: Date.now(),
                userName: await usersData.getName(senderID)
            };
            this.messageCache.set(messageID, messageData);

            // Clean old cache entries (older than 24 hours)
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            for (const [cachedId, cachedData] of this.messageCache.entries()) {
                if (cachedData.timestamp < twentyFourHoursAgo) {
                    this.messageCache.delete(cachedId);
                }
            }
        }

        // Handle unsend events
        if (event.type === "message_unsend") {
            const threadData = await threadsData.get(threadID);
            const trackUnsendEnabled = threadData.settings?.trackUnsend || false;

            if (!trackUnsendEnabled) return;

            // Get the cached message data
            const cachedMessage = this.messageCache.get(messageID);
            if (!cachedMessage) return;

            // Don't track bot's own unsent messages
            if (cachedMessage.senderID === api.getCurrentUserID()) return;

            const userName = cachedMessage.userName;
            let content = cachedMessage.body || getLang("noContent");
            
            // Handle attachments
            if (cachedMessage.attachments && cachedMessage.attachments.length > 0) {
                const attachmentTypes = cachedMessage.attachments.map(att => {
                    if (att.type === "photo") return "🖼️ Photo";
                    if (att.type === "video") return "🎥 Video";
                    if (att.type === "audio") return "🎵 Audio";
                    if (att.type === "file") return "📎 File";
                    return "📎 Attachment";
                });
                
                if (content === getLang("noContent")) {
                    content = attachmentTypes.join(", ");
                } else {
                    content += " + " + attachmentTypes.join(", ");
                }
            }

            const time = getTime("DD/MM/YYYY HH:mm:ss");
            const unsendNotification = getLang("unsendDetected", userName, content, time);

            // Send the notification and mark it as special (for admin-only unsend)
            try {
                const sentMessage = await api.sendMessage(unsendNotification, threadID);
                
                // Store this as an unsend notification that only admins can delete
                if (sentMessage && sentMessage.messageID) {
                    this.messageCache.set(sentMessage.messageID, {
                        senderID: api.getCurrentUserID(),
                        body: unsendNotification,
                        isUnsendNotification: true,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error("Failed to send unsend notification:", error);
            }

            // Remove the unsent message from cache
            this.messageCache.delete(messageID);
        }
    }
};
