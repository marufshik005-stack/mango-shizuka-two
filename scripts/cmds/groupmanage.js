const { getExtFromUrl, drive, getStreamFromURL } = global.utils;

module.exports = {
    config: {
        name: "groupmanage",
        aliases: ["gm", "managegroup", "groupcontrol"],
        version: "1.0",
        author: "Shizuka",
        countDown: 5,
        role: 2, // Only admin can use
        shortDescription: {
            vi: "Quản lý các nhóm chat",
            en: "Manage chat groups"
        },
        longDescription: {
            vi: "Xem danh sách tất cả các nhóm và tạm ngưng/bỏ tạm ngưng bot trong nhóm",
            en: "View all groups list and suspend/unsuspend bot in groups"
        },
        category: "admin",
        guide: {
            vi: [
                "   {pn}: Xem danh sách tất cả các nhóm",
                "   {pn} suspend <số thứ tự>: Tạm ngưng bot trong nhóm",
                "   {pn} unsuspend <số thứ tự>: Bỏ tạm ngưng bot trong nhóm",
                "   {pn} page <số trang>: Xem trang cụ thể"
            ],
            en: [
                "   {pn}: View all groups list",
                "   {pn} suspend <number>: Suspend bot in group",
                "   {pn} unsuspend <number>: Unsuspend bot in group",
                "   {pn} page <page number>: View specific page"
            ]
        }
    },

    langs: {
        vi: {
            noGroups: "❌ Không có nhóm nào trong cơ sở dữ liệu",
            groupsList: "📋 DANH SÁCH NHÓM CHAT",
            groupInfo: "📊 Nhóm {index}: {name}\n🆔 ID: {id}\n👥 Thành viên: {members}\n📅 Tham gia: {joinDate}\n🔒 Trạng thái: {status}",
            suspended: "🚫 TẠM NGƯNG",
            active: "✅ HOẠT ĐỘNG",
            pageInfo: "\n📖 Trang {current}/{total} • Tổng: {totalGroups} nhóm",
            navigation: "📌 Sử dụng: {prefix}groupmanage page <số> để xem trang khác",
            suspendSuccess: "✅ Đã tạm ngưng bot trong nhóm: {name}",
            unsuspendSuccess: "✅ Đã bỏ tạm ngưng bot trong nhóm: {name}",
            alreadySuspended: "⚠️ Nhóm này đã bị tạm ngưng rồi",
            alreadyActive: "⚠️ Nhóm này đang hoạt động bình thường",
            invalidNumber: "❌ Số thứ tự không hợp lệ. Vui lòng nhập số từ 1-{max}",
            groupNotFound: "❌ Không tìm thấy nhóm với số thứ tự này",
            suspendedMessage: "🚫 QUYỀN TRUY CẬP BỊ TỪ CHỐI\n\n⚠️ Nhóm của bạn hiện không được phép sử dụng Bot!\n\n📋 Để được hỗ trợ:\n• Gõ {prefix}supportgc để tham gia nhóm chính\n• Liên hệ với Admin Bot để được hỗ trợ\n\n💡 Cảm ơn bạn đã hiểu và tuân thủ!"
        },
        en: {
            noGroups: "❌ No groups found in database",
            groupsList: "📋 CHAT GROUPS LIST",
            groupInfo: "📊 Group {index}: {name}\n🆔 ID: {id}\n👥 Members: {members}\n📅 Joined: {joinDate}\n🔒 Status: {status}",
            suspended: "🚫 SUSPENDED",
            active: "✅ ACTIVE",
            pageInfo: "\n📖 Page {current}/{total} • Total: {totalGroups} groups",
            navigation: "📌 Use: {prefix}groupmanage page <number> to view other pages",
            suspendSuccess: "✅ Successfully suspended bot in group: {name}",
            unsuspendSuccess: "✅ Successfully unsuspended bot in group: {name}",
            alreadySuspended: "⚠️ This group is already suspended",
            alreadyActive: "⚠️ This group is already active",
            invalidNumber: "❌ Invalid number. Please enter number from 1-{max}",
            groupNotFound: "❌ Group not found with this number",
            suspendedMessage: "🚫 ACCESS DENIED\n\n⚠️ আপনার group এ Bot ব্যবহারের জন্য অনুমদিত নয়!\n\n📋 সহায়তার জন্য:\n• Type {prefix}supportgc to join Main group\n• Contact Bot Admin for support\n\n💡 ধন্যবাদ আপনার সহযোগিতার জন্য!"
        }
    },

    onStart: async function ({ message, args, getLang, commandName, prefix, threadsData }) {
        const action = args[0]?.toLowerCase();
        const pageSize = 10;

        try {
            // Get all thread data
            const allThreads = await threadsData.getAll();
            
            if (!allThreads || allThreads.length === 0) {
                return message.reply(getLang("noGroups"));
            }

            // Filter only group chats (threadID length > 15 typically indicates group)
            const groups = allThreads.filter(thread => 
                thread.threadID && 
                thread.threadID.toString().length > 15 &&
                thread.threadName
            );

            if (groups.length === 0) {
                return message.reply(getLang("noGroups"));
            }

            // Handle different actions
            if (action === "suspend" || action === "unsuspend") {
                const targetIndex = parseInt(args[1]);
                
                if (!targetIndex || targetIndex < 1 || targetIndex > groups.length) {
                    return message.reply(getLang("invalidNumber", { max: groups.length }));
                }

                const targetGroup = groups[targetIndex - 1];
                console.log(`[GROUPMANAGE DEBUG] Target index: ${targetIndex}, Array index: ${targetIndex - 1}, Group: ${targetGroup?.threadName}, ThreadID: ${targetGroup?.threadID}`);
                if (!targetGroup) {
                    return message.reply(getLang("groupNotFound"));
                }

                const threadData = await threadsData.get(targetGroup.threadID);
                const isSuspended = threadData.data?.suspended || false;
                console.log(`[GROUPMANAGE DEBUG] ThreadData for ${targetGroup.threadID}: suspended=${threadData.data?.suspended}, isSuspended=${isSuspended}`);

                if (action === "suspend") {
                    if (isSuspended) {
                        return message.reply(getLang("alreadySuspended"));
                    }
                    
                    console.log(`[GROUPMANAGE DEBUG] About to suspend ${targetGroup.threadID}`);
                    const result = await threadsData.set(targetGroup.threadID, { suspended: true }, "data");
                    console.log(`[GROUPMANAGE DEBUG] Set result:`, result);
                    
                    // Verify the data was saved
                    const verifyData = await threadsData.get(targetGroup.threadID);
                    console.log(`[GROUPMANAGE DEBUG] Verification - suspended status: ${verifyData.data?.suspended}`);
                    
                    return message.reply(getLang("suspendSuccess", { 
                        name: targetGroup.threadName 
                    }));
                } else {
                    if (!isSuspended) {
                        return message.reply(getLang("alreadyActive"));
                    }
                    
                    console.log(`[GROUPMANAGE DEBUG] About to unsuspend ${targetGroup.threadID}`);
                    const result = await threadsData.set(targetGroup.threadID, { suspended: false }, "data");
                    console.log(`[GROUPMANAGE DEBUG] Unsuspend result:`, result);
                    
                    // Verify the data was saved
                    const verifyData = await threadsData.get(targetGroup.threadID);
                    console.log(`[GROUPMANAGE DEBUG] Verification - suspended status: ${verifyData.data?.suspended}`);
                    
                    return message.reply(getLang("unsuspendSuccess", { 
                        name: targetGroup.threadName 
                    }));
                }
            }

            // Handle pagination
            let currentPage = 1;
            if (action === "page") {
                currentPage = parseInt(args[1]) || 1;
            }

            const totalPages = Math.ceil(groups.length / pageSize);
            currentPage = Math.max(1, Math.min(currentPage, totalPages));

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, groups.length);

            // Build message
            let messageText = `╔══════════════════════════╗\n`;
            messageText += `║        ${getLang("groupsList")}        ║\n`;
            messageText += `╚══════════════════════════╝\n\n`;

            for (let i = startIndex; i < endIndex; i++) {
                const group = groups[i];
                const threadData = await threadsData.get(group.threadID);
                const isSuspended = threadData.data?.suspended || false;
                
                const memberCount = group.members ? group.members.length : 0;
                const joinDate = new Date(group.joinDate || Date.now()).toLocaleDateString();
                const status = isSuspended ? getLang("suspended") : getLang("active");
                
                // Debug thread data structure
                console.log(`[THREADDATA DEBUG] ThreadID: ${group.threadID}, Full threadData:`, JSON.stringify(threadData, null, 2));
                
                // Manually format group info to ensure template replacement works  
                const globalIndex = i + 1; // This is the correct global index for suspend/unsuspend commands
                const debugInfo = `[DEBUG] Array index: ${i}, Global index: ${globalIndex}, ThreadID: ${group.threadID}`;
                console.log(debugInfo);
                const groupInfoText = `📊 Group ${globalIndex}: ${group.threadName || "Unknown"}\n🆔 ID: ${group.threadID}\n👥 Members: ${memberCount}\n📅 Joined: ${joinDate}\n🔒 Status: ${status}\n🔧 ${debugInfo}`;
                
                messageText += groupInfoText + "\n";
                
                messageText += `${"─".repeat(35)}\n\n`;
            }

            // Manually format page info
            messageText += `\n📖 Page ${currentPage}/${totalPages} • Total: ${groups.length} groups`;

            if (totalPages > 1) {
                messageText += `\n📌 Use: ${prefix}groupmanage page <number> to view other pages`;
            }

            messageText += `\n\n📋 Commands:\n`;
            messageText += `• ${prefix}${commandName} suspend <number>\n`;
            messageText += `• ${prefix}${commandName} unsuspend <number>\n`;
            messageText += `• ${prefix}${commandName} page <number>`;

            return message.reply(messageText);

        } catch (error) {
            console.error("GroupManage Error:", error);
            return message.reply("❌ An error occurred while processing the command.");
        }
    },

    // onChat removed - suspension checking is now handled globally in handlerEvents.js
};