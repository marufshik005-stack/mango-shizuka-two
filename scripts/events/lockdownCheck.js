module.exports = {
        config: {
                name: "lockdownCheck",
                version: "1.0",
                author: "Your Name",
                category: "events"
        },

        onChat: async ({ event, threadsData, api, usersData }) => {
                const { threadID, senderID, messageID } = event;
                
                if (!messageID) {
                        return;
                }
                
                const lockdownEnabled = await threadsData.get(threadID, "data.lockdown") || false;
                
                if (!lockdownEnabled) {
                        return;
                }

                const botID = api.getCurrentUserID();
                if (senderID === botID) {
                        return;
                }

                const botAdmins = global.GoatBot.config.adminBot || [];
                const isBotOwner = botAdmins.includes(senderID);
                
                if (isBotOwner) {
                        return;
                }

                api.unsendMessage(messageID);
                
                return;
        }
};
