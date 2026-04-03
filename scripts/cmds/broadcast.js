const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "broadcast",
        aliases: ["bc", "send", "sendall", "announce"],
        version: "2.0",
        author: "Shizuka",
        countDown: 10,
        role: 2, // Only admin can use
        shortDescription: {
            vi: "Gửi tin nhắn đến tất cả nhóm hoặc nhóm cụ thể",
            en: "Send message to all groups or specific groups"
        },
        longDescription: {
            vi: "Gửi văn bản, hình ảnh, video, liên kết đến tất cả nhóm hoặc nhóm được chỉ định",
            en: "Send text, images, videos, links to all groups or specified groups"
        },
        category: "admin",
        guide: {
            vi: [
                "   {pn} <tin nhắn>: Gửi đến tất cả nhóm",
                "   {pn} -g <group_id> <tin nhắn>: Gửi đến nhóm cụ thể",
                "   {pn} -list: Xem danh sách nhóm",
                "   Reply tin nhắn + {pn}: Gửi tin nhắn được reply"
            ],
            en: [
                "   {pn} <message>: Send to all groups",
                "   {pn} -g <group_id> <message>: Send to specific group",
                "   {pn} -list: View groups list",
                "   Reply message + {pn}: Send replied message"
            ]
        }
    },

    langs: {
        vi: {
            noMessage: "❌ Vui lòng nhập tin nhắn cần gửi",
            noGroups: "❌ Không tìm thấy nhóm nào",
            invalidGroupId: "❌ ID nhóm không hợp lệ",
            groupNotFound: "❌ Không tìm thấy nhóm với ID: {id}",
            broadcasting: "📡 Đang gửi tin nhắn...",
            broadcastComplete: "✅ Đã gửi tin nhắn đến {sent}/{total} nhóm\n⏱️ Thời gian: {time}s\n❌ Lỗi: {errors} nhóm",
            groupsList: "📋 DANH SÁCH NHÓM",
            groupInfo: "{index}. {name}\n🆔 ID: {id}\n👥 {members} thành viên",
            pageInfo: "\n📖 Trang {current}/{total} • Tổng: {totalGroups} nhóm",
            sentToGroup: "✅ Đã gửi tin nhắn đến nhóm: {name}",
            failedToGroup: "❌ Không thể gửi đến nhóm: {name}",
            broadcastHeader: "📢 THÔNG BÁO QUAN TRỌNG\n" + "═".repeat(30),
            adminSignature: "\n" + "─".repeat(25) + "\n👑 Admin: Shizuka Bot\n🕒 {time}"
        },
        en: {
            noMessage: "❌ Please enter a message to send",
            noGroups: "❌ No groups found",
            invalidGroupId: "❌ Invalid group ID",
            groupNotFound: "❌ Group not found with ID: {id}",
            broadcasting: "📡 Broadcasting message...",
            broadcastComplete: "✅ Message sent to {sent}/{total} groups\n⏱️ Time: {time}s\n❌ Errors: {errors} groups",
            groupsList: "📋 GROUPS LIST",
            groupInfo: "{index}. {name}\n🆔 ID: {id}\n👥 {members} members",
            pageInfo: "\n📖 Page {current}/{total} • Total: {totalGroups} groups",
            sentToGroup: "✅ Message sent to group: {name}",
            failedToGroup: "❌ Failed to send to group: {name}",
            broadcastHeader: "📢 IMPORTANT ANNOUNCEMENT\n" + "═".repeat(30),
            adminSignature: "\n" + "─".repeat(25) + "\n👑 Admin: Shizuka Bot\n🕒 {time}"
        }
    },

    onStart: async function ({ message, args, getLang, api, threadsData, event, prefix }) {
        const startTime = Date.now();
        
        try {
            // Handle -list command
            if (args[0] === "-list") {
                return await this.showGroupsList({ message, args, getLang, threadsData, prefix });
            }

            // Handle specific group sending
            if (args[0] === "-g") {
                const targetGroupId = args[1];
                const messageContent = args.slice(2).join(" ");
                
                if (!targetGroupId) {
                    return message.reply(getLang("invalidGroupId"));
                }
                
                if (!messageContent && !event.messageReply) {
                    return message.reply(getLang("noMessage"));
                }

                return await this.sendToSpecificGroup({ 
                    message, getLang, api, threadsData, 
                    targetGroupId, messageContent, event 
                });
            }

            // Get message content
            let messageContent = args.join(" ");
            let messageReply = event.messageReply;

            if (!messageContent && !messageReply) {
                return message.reply(getLang("noMessage"));
            }

            // Show broadcasting message
            const broadcastingMsg = await message.reply(getLang("broadcasting"));

            // Get all groups
            const allThreads = await threadsData.getAll();
            const groups = allThreads.filter(thread => 
                thread.threadID && 
                thread.threadID.toString().length > 15 &&
                thread.threadName &&
                !thread.suspended // Don't send to suspended groups
            );

            if (groups.length === 0) {
                return message.edit(broadcastingMsg.messageID, getLang("noGroups"));
            }

            // Prepare message
            const finalMessage = this.formatBroadcastMessage(messageContent, getLang);
            let sentCount = 0;
            let errorCount = 0;
            const errors = [];

            // Send to all groups
            for (const group of groups) {
                try {
                    await this.sendMessageToGroup(api, group.threadID, finalMessage, messageReply);
                    sentCount++;
                    
                    // Add small delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    errorCount++;
                    errors.push(`${group.threadName}: ${error.message}`);
                    console.error(`Broadcast error for ${group.threadName}:`, error);
                }
            }

            // Calculate time taken
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);

            // Send completion report (manual formatting to avoid template issues)
            const completionMessage = `✅ Message sent to ${sentCount}/${groups.length} groups\n⏱️ Time: ${timeTaken}s\n❌ Errors: ${errorCount} groups`;

            // Add error details if any
            let finalReport = completionMessage;
            if (errors.length > 0 && errors.length <= 5) {
                finalReport += "\n\n❌ Failed groups:\n" + errors.slice(0, 5).map(e => `• ${e}`).join("\n");
            }

            await message.edit(broadcastingMsg.messageID, finalReport);

        } catch (error) {
            console.error("Broadcast Error:", error);
            return message.reply("❌ An error occurred during broadcast: " + error.message);
        }
    },

    async sendToSpecificGroup({ message, getLang, api, threadsData, targetGroupId, messageContent, event }) {
        try {
            // Get group data
            const groupData = await threadsData.get(targetGroupId);
            if (!groupData) {
                return message.reply(getLang("groupNotFound", { id: targetGroupId }));
            }

            // Check if group is suspended
            if (groupData.suspended) {
                return message.reply("⚠️ Cannot send to suspended group: " + groupData.threadName);
            }

            // Prepare message
            const finalMessage = this.formatBroadcastMessage(messageContent, getLang);
            
            // Send message
            await this.sendMessageToGroup(api, targetGroupId, finalMessage, event.messageReply);
            
            return message.reply(getLang("sentToGroup", { name: groupData.threadName || "Unknown" }));

        } catch (error) {
            console.error("Send to specific group error:", error);
            return message.reply(getLang("failedToGroup", { name: "Target Group" }) + "\n" + error.message);
        }
    },

    async showGroupsList({ message, args, getLang, threadsData, prefix }) {
        const pageSize = 15;
        let currentPage = 1;
        
        if (args[1] && !isNaN(args[1])) {
            currentPage = Math.max(1, parseInt(args[1]));
        }

        try {
            const allThreads = await threadsData.getAll();
            const groups = allThreads.filter(thread => 
                thread.threadID && 
                thread.threadID.toString().length > 15 &&
                thread.threadName
            );

            if (groups.length === 0) {
                return message.reply(getLang("noGroups"));
            }

            const totalPages = Math.ceil(groups.length / pageSize);
            currentPage = Math.min(currentPage, totalPages);

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, groups.length);

            // Build message
            let messageText = `╔══════════════════════════╗\n`;
            messageText += `║     ${getLang("groupsList")}      ║\n`;
            messageText += `╚══════════════════════════╝\n\n`;

            for (let i = startIndex; i < endIndex; i++) {
                const group = groups[i];
                const memberCount = group.members ? group.members.length : 0;
                const status = group.suspended ? "🚫" : "✅";
                
                // Manual formatting to avoid template issues
                messageText += `${i + 1}. ${group.threadName || "Unknown"}\n🆔 ID: ${group.threadID}\n👥 ${memberCount} members ${status}\n`;
                messageText += `${"─".repeat(30)}\n\n`;
            }

            // Manual page info formatting
            messageText += `\n📖 Page ${currentPage}/${totalPages} • Total: ${groups.length} groups`;

            messageText += `\n\n📋 Usage:\n• ${prefix}broadcast -g <ID> <message>\n• ${prefix}broadcast -list <page>`;

            return message.reply(messageText);

        } catch (error) {
            console.error("Show groups list error:", error);
            return message.reply("❌ Error loading groups list");
        }
    },

    formatBroadcastMessage(content, getLang) {
        if (!content) return "";
        
        const header = getLang("broadcastHeader");
        const signature = getLang("adminSignature", { 
            time: new Date().toLocaleString('en-US', { 
                timeZone: 'Asia/Dhaka',
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        });
        
        return `${header}\n\n${content}${signature}`;
    },

    async sendMessageToGroup(api, threadID, messageText, messageReply) {
        try {
            // If there's a reply with attachments
            if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
                const attachments = [];
                
                for (const attachment of messageReply.attachments) {
                    if (attachment.type === "photo" || attachment.type === "video" || attachment.type === "audio") {
                        attachments.push(await global.utils.getStreamFromURL(attachment.url));
                    }
                }
                
                await api.sendMessage({
                    body: messageText || messageReply.body || "",
                    attachment: attachments
                }, threadID);
            }
            // If there's only text in reply
            else if (messageReply && messageReply.body) {
                const combinedMessage = messageText ? `${messageText}\n\n📝 ${messageReply.body}` : messageReply.body;
                await api.sendMessage(combinedMessage, threadID);
            }
            // Regular text message
            else {
                await api.sendMessage(messageText, threadID);
            }
        } catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }
};