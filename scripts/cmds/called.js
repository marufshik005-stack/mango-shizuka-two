const fs = require('fs');
const path = require('path');

// Store for ongoing conversations
const conversationsPath = path.join(__dirname, '..', '..', 'conversations.json');

module.exports = {
    config: {
        name: "called",
        aliases: ["call", "contact", "msg", "message"],
        version: "2.0",
        author: "zisan",
        countDown: 15,
        role: 0, // Everyone can use
        shortDescription: {
            vi: "Liên hệ với admin",
            en: "Contact admin"
        },
        longDescription: {
            vi: "Gửi tin nhắn đến admin và nhận phản hồi",
            en: "Send message to admin and receive replies"
        },
        category: "utility",
        guide: {
            vi: [
                "   {pn} <tin nhắn>: Gửi tin nhắn đến admin",
                "   Reply tin nhắn admin + {pn} <phản hồi>: Trả lời admin"
            ],
            en: [
                "   {pn} <message>: Send message to admin",
                "   Reply admin message + {pn} <reply>: Reply to admin"
            ]
        }
    },

    langs: {
        vi: {
            noMessage: "❌ Vui lòng nhập tin nhắn cần gửi",
            messageSent: "✅ Tin nhắn đã được gửi đến admin!\n🆔 ID cuộc trò chuyện: {conversationId}\n⏰ Admin sẽ phản hồi sớm nhất có thể",
            noAdminGroup: "❌ Không tìm thấy nhóm admin",
            userMessage: "📨 TIN NHẮN TỪ NGƯỜI DÙNG\n{separator}\n👤 Từ: {userName} ({userId})\n🏠 Nhóm: {groupName} ({groupId})\n🆔 ID cuộc trò chuyện: {conversationId}\n🕒 Thời gian: {time}\n{separator}\n\n{message}\n\n{replyGuide}",
            replyGuide: "💡 Để trả lời: Reply tin nhắn này + /called <phản hồi>",
            adminReply: "📞 PHẢN HỒI TỪ ADMIN\n{separator}\n👑 Admin: Shizuka Bot\n🆔 ID cuộc trò chuyện: {conversationId}\n🕒 Thời gian: {time}\n{separator}\n\n{message}",
            conversationNotFound: "❌ Không tìm thấy cuộc trò chuyện này",
            replySent: "✅ Phản hồi đã được gửi đến người dùng!"
        },
        en: {
            noMessage: "❌ Please enter a message to send",
            messageSent: "✅ Message sent to admin!\n🆔 Conversation ID: {conversationId}\n⏰ Admin will reply as soon as possible",
            noAdminGroup: "❌ Admin group not found",
            userMessage: "📨 USER MESSAGE\n{separator}\n👤 From: {userName} ({userId})\n🏠 Group: {groupName} ({groupId})\n🆔 Conversation ID: {conversationId}\n🕒 Time: {time}\n{separator}\n\n{message}\n\n{replyGuide}",
            replyGuide: "💡 To reply: Reply this message + /called <response>",
            adminReply: "📞 ADMIN REPLY\n{separator}\n👑 Admin: Shizuka Bot\n🆔 Conversation ID: {conversationId}\n🕒 Time: {time}\n{separator}\n\n{message}",
            conversationNotFound: "❌ Conversation not found",
            replySent: "✅ Reply sent to user!"
        }
    },

    onStart: async function ({ message, args, getLang, api, event, threadsData, usersData }) {
        try {
            const messageContent = args.join(" ");
            const messageReply = event.messageReply;
            
            // Check if this is a reply to an admin message (for users) or user message (for admins)
            if (messageReply) {
                const conversationId = this.extractConversationId(messageReply.body);
                
                if (conversationId) {
                    return await this.handleReply({
                        message, getLang, api, event, threadsData, usersData,
                        messageContent, conversationId, messageReply
                    });
                }
            }

            // If no message content and no attachments
            if (!messageContent && !messageReply) {
                return message.reply(getLang("noMessage"));
            }

            // Send new message to admin
            return await this.sendToAdmin({
                message, getLang, api, event, threadsData, usersData,
                messageContent, messageReply
            });

        } catch (error) {
            console.error("Called command error:", error);
            return message.reply("❌ An error occurred: " + error.message);
        }
    },

    async sendToAdmin({ message, getLang, api, event, threadsData, usersData, messageContent, messageReply }) {
        try {
            // Get admin group ID (you can customize this)
            const adminGroupId = "7957131877728399"; // Replace with your admin group ID
            
            // Generate conversation ID
            const conversationId = this.generateConversationId();
            
            // Get user and group information
            const userData = await usersData.get(event.senderID);
            const groupData = await threadsData.get(event.threadID);
            
            const userName = userData?.name || event.senderName || "Unknown User";
            const groupName = groupData?.threadName || "Unknown Group";
            
            // Store conversation
            this.saveConversation(conversationId, {
                userId: event.senderID,
                userName: userName,
                groupId: event.threadID,
                groupName: groupName,
                timestamp: new Date().toISOString(),
                lastMessage: messageContent || messageReply?.body || "[Attachment]"
            });

            // Prepare message for admin
            const separator = "═".repeat(40);
            const replyGuide = getLang("replyGuide");
            
            let adminMessage = getLang("userMessage");
            adminMessage = adminMessage
                .replace(/\{separator\}/g, separator)
                .replace(/\{userName\}/g, userName)
                .replace(/\{userId\}/g, event.senderID)
                .replace(/\{groupName\}/g, groupName)
                .replace(/\{groupId\}/g, event.threadID)
                .replace(/\{conversationId\}/g, conversationId)
                .replace(/\{time\}/g, new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
                .replace(/\{message\}/g, messageContent || "[User sent an attachment]")
                .replace(/\{replyGuide\}/g, replyGuide);

            // Send to admin group
            await this.sendMessageWithAttachments(api, adminGroupId, adminMessage, messageReply);
            
            // Confirm to user
            let confirmMessage = getLang("messageSent");
            confirmMessage = confirmMessage.replace(/\{conversationId\}/g, conversationId);
            return message.reply(confirmMessage);

        } catch (error) {
            console.error("Send to admin error:", error);
            return message.reply("❌ Failed to send message to admin: " + error.message);
        }
    },

    async handleReply({ message, getLang, api, event, threadsData, usersData, messageContent, conversationId, messageReply }) {
        try {
            // Get conversation data
            const conversation = this.getConversation(conversationId);
            if (!conversation) {
                return message.reply(getLang("conversationNotFound"));
            }

            // Check if this is admin replying or user replying
            const adminGroupId = "1335966794561349"; // Replace with your admin group ID
            const isAdminReply = event.threadID === adminGroupId;

            if (isAdminReply) {
                // Admin is replying to user
                return await this.sendAdminReplyToUser({
                    message, getLang, api, event,
                    messageContent, conversation, messageReply
                });
            } else {
                // User is replying to admin
                return await this.sendUserReplyToAdmin({
                    message, getLang, api, event, threadsData, usersData,
                    messageContent, conversationId, messageReply
                });
            }

        } catch (error) {
            console.error("Handle reply error:", error);
            return message.reply("❌ Failed to handle reply: " + error.message);
        }
    },

    async sendAdminReplyToUser({ message, getLang, api, event, messageContent, conversation, messageReply }) {
        try {
            const separator = "═".repeat(40);
            
            let replyMessage = getLang("adminReply");
            replyMessage = replyMessage
                .replace(/\{separator\}/g, separator)
                .replace(/\{conversationId\}/g, conversation.conversationId || "Unknown")
                .replace(/\{time\}/g, new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
                .replace(/\{message\}/g, messageContent || "[Admin sent an attachment]");

            // Send reply to user's original group
            await this.sendMessageWithAttachments(api, conversation.groupId, replyMessage, messageReply);
            
            // Update conversation
            this.updateConversation(conversation.conversationId || "Unknown", {
                lastAdminReply: messageContent || "[Attachment]",
                lastReplyTime: new Date().toISOString()
            });

            return message.reply(getLang("replySent"));

        } catch (error) {
            console.error("Send admin reply error:", error);
            return message.reply("❌ Failed to send reply to user: " + error.message);
        }
    },

    async sendUserReplyToAdmin({ message, getLang, api, event, threadsData, usersData, messageContent, conversationId, messageReply }) {
        try {
            const adminGroupId = "1335966794561349"; // Replace with your admin group ID
            
            // Get user and group information
            const userData = await usersData.get(event.senderID);
            const groupData = await threadsData.get(event.threadID);
            
            const userName = userData?.name || event.senderName || "Unknown User";
            const groupName = groupData?.threadName || "Unknown Group";

            const separator = "═".repeat(40);
            const userReplyMessage = `📨 USER REPLY\n${separator}\n👤 From: ${userName} (${event.senderID})\n🏠 Group: ${groupName} (${event.threadID})\n🆔 Conversation ID: ${conversationId}\n🕒 Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}\n${separator}\n\n${messageContent || "[User sent an attachment]"}\n\n💡 To reply: Reply this message + /called <response>`;

            // Send to admin group
            await this.sendMessageWithAttachments(api, adminGroupId, userReplyMessage, messageReply);
            
            // Update conversation
            this.updateConversation(conversationId, {
                lastUserReply: messageContent || "[Attachment]",
                lastUserReplyTime: new Date().toISOString()
            });

            return message.reply("✅ Your reply has been sent to admin!");

        } catch (error) {
            console.error("Send user reply error:", error);
            return message.reply("❌ Failed to send reply to admin: " + error.message);
        }
    },

    async sendMessageWithAttachments(api, threadID, messageText, messageReply) {
        try {
            if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
                const attachments = [];
                
                for (const attachment of messageReply.attachments) {
                    if (attachment.type === "photo" || attachment.type === "video" || attachment.type === "audio") {
                        attachments.push(await global.utils.getStreamFromURL(attachment.url));
                    }
                }
                
                await api.sendMessage({
                    body: messageText,
                    attachment: attachments
                }, threadID);
            } else {
                await api.sendMessage(messageText, threadID);
            }
        } catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    },

    generateConversationId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    extractConversationId(messageBody) {
        const match = messageBody?.match(/🆔 (?:Conversation ID|ID cuộc trò chuyện): ([a-z0-9]+)/i);
        return match ? match[1] : null;
    },

    saveConversation(conversationId, data) {
        try {
            let conversations = {};
            
            if (fs.existsSync(conversationsPath)) {
                conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
            }
            
            conversations[conversationId] = {
                ...data,
                conversationId,
                createdAt: new Date().toISOString()
            };
            
            fs.writeFileSync(conversationsPath, JSON.stringify(conversations, null, 2));
        } catch (error) {
            console.error("Save conversation error:", error);
        }
    },

    getConversation(conversationId) {
        try {
            if (!fs.existsSync(conversationsPath)) {
                return null;
            }
            
            const conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
            return conversations[conversationId] || null;
        } catch (error) {
            console.error("Get conversation error:", error);
            return null;
        }
    },

    updateConversation(conversationId, updateData) {
        try {
            if (!fs.existsSync(conversationsPath)) {
                return;
            }
            
            const conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
            
            if (conversations[conversationId]) {
                conversations[conversationId] = {
                    ...conversations[conversationId],
                    ...updateData,
                    updatedAt: new Date().toISOString()
                };
                
                fs.writeFileSync(conversationsPath, JSON.stringify(conversations, null, 2));
            }
        } catch (error) {
            console.error("Update conversation error:", error);
        }
    }
};
