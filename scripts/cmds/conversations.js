const fs = require('fs');
const path = require('path');

// Store for ongoing conversations
const conversationsPath = path.join(__dirname, '..', '..', 'conversations.json');

module.exports = {
    config: {
        name: "conversations",
        aliases: ["conv", "chats", "tickets"],
        version: "1.0",
        author: "zisan",
        countDown: 5,
        role: 2, // Only admin can use
        shortDescription: {
            vi: "Quản lý cuộc trò chuyện với người dùng",
            en: "Manage conversations with users"
        },
        longDescription: {
            vi: "Xem và quản lý tất cả cuộc trò chuyện giữa admin và người dùng",
            en: "View and manage all conversations between admin and users"
        },
        category: "admin",
        guide: {
            vi: [
                "   {pn}: Xem tất cả cuộc trò chuyện",
                "   {pn} active: Xem cuộc trò chuyện đang hoạt động",
                "   {pn} <id>: Xem chi tiết cuộc trò chuyện",
                "   {pn} clear: Xóa cuộc trò chuyện cũ"
            ],
            en: [
                "   {pn}: View all conversations",
                "   {pn} active: View active conversations",
                "   {pn} <id>: View conversation details",
                "   {pn} clear: Clear old conversations"
            ]
        }
    },

    langs: {
        vi: {
            noConversations: "❌ Không có cuộc trò chuyện nào",
            conversationsList: "📋 DANH SÁCH CUỘC TRÒ CHUYỆN",
            conversationInfo: "🆔 {id}\n👤 {userName} ({userId})\n🏠 {groupName}\n🕒 {time}\n💬 {lastMessage}",
            conversationDetails: "📋 CHI TIẾT CUỘC TRÒ CHUYỆN",
            detailInfo: "🆔 ID: {id}\n👤 Người dùng: {userName} ({userId})\n🏠 Nhóm: {groupName} ({groupId})\n🕒 Bắt đầu: {startTime}\n🕐 Cập nhật cuối: {lastUpdate}\n📨 Tin nhắn đầu: {firstMessage}\n📞 Phản hồi cuối: {lastReply}",
            activeConversations: "📋 CUỘC TRÒ CHUYỆN ĐANG HOẠT ĐỘNG",
            conversationNotFound: "❌ Không tìm thấy cuộc trò chuyện",
            conversationsCleared: "✅ Đã xóa {count} cuộc trò chuyện cũ",
            pageInfo: "\n📖 Trang {current}/{total} • Tổng: {total} cuộc trò chuyện"
        },
        en: {
            noConversations: "❌ No conversations found",
            conversationsList: "📋 CONVERSATIONS LIST",
            conversationInfo: "🆔 {id}\n👤 {userName} ({userId})\n🏠 {groupName}\n🕒 {time}\n💬 {lastMessage}",
            conversationDetails: "📋 CONVERSATION DETAILS",
            detailInfo: "🆔 ID: {id}\n👤 User: {userName} ({userId})\n🏠 Group: {groupName} ({groupId})\n🕒 Started: {startTime}\n🕐 Last Update: {lastUpdate}\n📨 First Message: {firstMessage}\n📞 Last Reply: {lastReply}",
            activeConversations: "📋 ACTIVE CONVERSATIONS",
            conversationNotFound: "❌ Conversation not found",
            conversationsCleared: "✅ Cleared {count} old conversations",
            pageInfo: "\n📖 Page {current}/{total} • Total: {totalConversations} conversations"
        }
    },

    onStart: async function ({ message, args, getLang, prefix }) {
        try {
            const action = args[0]?.toLowerCase();

            // Handle different actions
            if (action === "clear") {
                return await this.clearOldConversations({ message, getLang });
            }

            if (action === "active") {
                return await this.showActiveConversations({ message, getLang, prefix });
            }

            // If args[0] looks like a conversation ID
            if (action && action.length > 5) {
                return await this.showConversationDetails({ message, getLang, conversationId: action });
            }

            // Show all conversations (default)
            return await this.showAllConversations({ message, args, getLang, prefix });

        } catch (error) {
            console.error("Conversations command error:", error);
            return message.reply("❌ An error occurred: " + error.message);
        }
    },

    async showAllConversations({ message, args, getLang, prefix }) {
        try {
            const conversations = this.getAllConversations();
            
            if (Object.keys(conversations).length === 0) {
                return message.reply(getLang("noConversations"));
            }

            const pageSize = 10;
            let currentPage = 1;
            
            if (args[0] && !isNaN(args[0])) {
                currentPage = Math.max(1, parseInt(args[0]));
            }

            const conversationArray = Object.values(conversations).sort((a, b) => 
                new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
            );

            const totalPages = Math.ceil(conversationArray.length / pageSize);
            currentPage = Math.min(currentPage, totalPages);

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, conversationArray.length);

            // Build message
            let messageText = `╔══════════════════════════╗\n`;
            messageText += `║  ${getLang("conversationsList")}  ║\n`;
            messageText += `╚══════════════════════════╝\n\n`;

            for (let i = startIndex; i < endIndex; i++) {
                const conv = conversationArray[i];
                const lastUpdate = conv.updatedAt || conv.createdAt;
                const shortMessage = (conv.lastMessage || "").substring(0, 30) + "...";
                
                messageText += getLang("conversationInfo", {
                    id: conv.conversationId?.substring(0, 8) || "Unknown",
                    userName: conv.userName || "Unknown",
                    userId: conv.userId || "Unknown",
                    groupName: conv.groupName || "Unknown",
                    time: new Date(lastUpdate).toLocaleString(),
                    lastMessage: shortMessage
                });
                
                messageText += `\n${"─".repeat(35)}\n\n`;
            }

            messageText += getLang("pageInfo", {
                current: currentPage,
                total: totalPages,
                totalConversations: conversationArray.length
            });

            messageText += `\n\n📋 Commands:\n• ${prefix}conversations <page>\n• ${prefix}conversations <id>\n• ${prefix}conversations active\n• ${prefix}conversations clear`;

            return message.reply(messageText);

        } catch (error) {
            console.error("Show all conversations error:", error);
            return message.reply("❌ Error loading conversations");
        }
    },

    async showActiveConversations({ message, getLang, prefix }) {
        try {
            const conversations = this.getAllConversations();
            const activeConversations = Object.values(conversations).filter(conv => {
                // Consider active if updated in last 24 hours
                const lastUpdate = new Date(conv.updatedAt || conv.createdAt);
                const now = new Date();
                const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
                return hoursDiff < 24;
            });

            if (activeConversations.length === 0) {
                return message.reply("❌ No active conversations in last 24 hours");
            }

            // Sort by most recent
            activeConversations.sort((a, b) => 
                new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
            );

            // Build message
            let messageText = `╔══════════════════════════╗\n`;
            messageText += `║ ${getLang("activeConversations")} ║\n`;
            messageText += `╚══════════════════════════╝\n\n`;

            for (const conv of activeConversations.slice(0, 10)) { // Show max 10
                const lastUpdate = conv.updatedAt || conv.createdAt;
                const shortMessage = (conv.lastMessage || "").substring(0, 25) + "...";
                const hoursAgo = Math.floor((new Date() - new Date(lastUpdate)) / (1000 * 60 * 60));
                
                messageText += `🆔 ${conv.conversationId?.substring(0, 8)}\n`;
                messageText += `👤 ${conv.userName} (${conv.userId})\n`;
                messageText += `🏠 ${conv.groupName}\n`;
                messageText += `🕒 ${hoursAgo}h ago\n`;
                messageText += `💬 ${shortMessage}\n`;
                messageText += `${"─".repeat(30)}\n\n`;
            }

            messageText += `💡 Use: ${prefix}conversations <id> for details`;

            return message.reply(messageText);

        } catch (error) {
            console.error("Show active conversations error:", error);
            return message.reply("❌ Error loading active conversations");
        }
    },

    async showConversationDetails({ message, getLang, conversationId }) {
        try {
            const conversation = this.getConversation(conversationId);
            
            if (!conversation) {
                return message.reply(getLang("conversationNotFound"));
            }

            const messageText = `╔══════════════════════════╗\n║  ${getLang("conversationDetails")}  ║\n╚══════════════════════════╝\n\n` + 
                getLang("detailInfo", {
                    id: conversation.conversationId || "Unknown",
                    userName: conversation.userName || "Unknown",
                    userId: conversation.userId || "Unknown",
                    groupName: conversation.groupName || "Unknown",
                    groupId: conversation.groupId || "Unknown",
                    startTime: new Date(conversation.createdAt).toLocaleString(),
                    lastUpdate: new Date(conversation.updatedAt || conversation.createdAt).toLocaleString(),
                    firstMessage: conversation.lastMessage || "No message",
                    lastReply: conversation.lastAdminReply || "No reply yet"
                });

            return message.reply(messageText);

        } catch (error) {
            console.error("Show conversation details error:", error);
            return message.reply("❌ Error loading conversation details");
        }
    },

    async clearOldConversations({ message, getLang }) {
        try {
            const conversations = this.getAllConversations();
            const now = new Date();
            let clearedCount = 0;
            
            const updatedConversations = {};
            
            for (const [id, conv] of Object.entries(conversations)) {
                const lastUpdate = new Date(conv.updatedAt || conv.createdAt);
                const daysDiff = (now - lastUpdate) / (1000 * 60 * 60 * 24);
                
                // Keep conversations from last 7 days
                if (daysDiff < 7) {
                    updatedConversations[id] = conv;
                } else {
                    clearedCount++;
                }
            }
            
            // Save updated conversations
            fs.writeFileSync(conversationsPath, JSON.stringify(updatedConversations, null, 2));
            
            return message.reply(getLang("conversationsCleared", { count: clearedCount }));

        } catch (error) {
            console.error("Clear conversations error:", error);
            return message.reply("❌ Error clearing conversations");
        }
    },

    getAllConversations() {
        try {
            if (!fs.existsSync(conversationsPath)) {
                return {};
            }
            
            return JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
        } catch (error) {
            console.error("Get all conversations error:", error);
            return {};
        }
    },

    getConversation(conversationId) {
        try {
            const conversations = this.getAllConversations();
            
            // Try exact match first
            if (conversations[conversationId]) {
                return conversations[conversationId];
            }
            
            // Try partial match
            for (const [id, conv] of Object.entries(conversations)) {
                if (id.startsWith(conversationId) || id.includes(conversationId)) {
                    return conv;
                }
            }
            
            return null;
        } catch (error) {
            console.error("Get conversation error:", error);
            return null;
        }
    }
};