module.exports = {
    config: {
        name: "checksuspension",
        aliases: ["checksusp", "suspstatus"],
        version: "1.0.0",
        author: "GoatBot",
        countDown: 5,
        role: 2, // Only admin
        shortDescription: "Check suspension status of current or specified group",
        longDescription: "Debug command to check if a group is suspended and view suspension data",
        category: "owner",
        guide: {
            en: "{pn} [threadID] - Check suspension status"
        }
    },

    onStart: async function ({ message, args, threadsData, event }) {
        try {
            const targetThreadID = args[0] || event.threadID;
            
            console.log(`[CHECKSUSPENSION] Checking suspension status for thread: ${targetThreadID}`);
            
            // Get thread data from database
            const threadData = await threadsData.get(targetThreadID);
            
            if (!threadData) {
                return message.reply(`❌ Thread data not found for ID: ${targetThreadID}`);
            }
            
            console.log(`[CHECKSUSPENSION] Full thread data:`, JSON.stringify(threadData, null, 2));
            
            const isSuspended = threadData.data?.suspended === true;
            const threadName = threadData.threadName || "Unknown";
            
            let statusMessage = `🔍 **SUSPENSION STATUS CHECK**\\n`;
            statusMessage += `━━━━━━━━━━━━━━━━━━━━━━━\\n\\n`;
            statusMessage += `📋 **Group Info:**\\n`;
            statusMessage += `• Name: ${threadName}\\n`;
            statusMessage += `• Thread ID: ${targetThreadID}\\n`;
            statusMessage += `• Is Group: ${threadData.isGroup || false}\\n\\n`;
            
            statusMessage += `🚫 **Suspension Status:**\\n`;
            statusMessage += `• Suspended: ${isSuspended ? '✅ YES' : '❌ NO'}\\n`;
            statusMessage += `• Data Object Exists: ${threadData.data ? '✅ YES' : '❌ NO'}\\n`;
            statusMessage += `• Suspended Property: ${threadData.data?.suspended || 'undefined'}\\n\\n`;
            
            if (threadData.data) {
                statusMessage += `📊 **Other Data Properties:**\\n`;
                const dataKeys = Object.keys(threadData.data);
                if (dataKeys.length > 0) {
                    dataKeys.forEach(key => {
                        statusMessage += `• ${key}: ${typeof threadData.data[key]} = ${JSON.stringify(threadData.data[key]).substring(0, 50)}\\n`;
                    });
                } else {
                    statusMessage += `• No other properties in data object\\n`;
                }
            }
            
            statusMessage += `\\n🔧 **Debug Info:**\\n`;
            statusMessage += `• Check performed at: ${new Date().toLocaleString()}\\n`;
            statusMessage += `• Database query successful: ✅\\n`;
            
            await message.reply(statusMessage);
            
        } catch (error) {
            console.error(`[CHECKSUSPENSION] Error:`, error);
            await message.reply(`❌ Error checking suspension status: ${error.message}`);
        }
    }
};