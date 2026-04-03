const axios = require('axios');

module.exports = {
    config: {
        name: "slap",
        aliases: ["👋", "slapping"],
        version: "1.0.0",
        author: "GoatBot",
        countDown: 5,
        role: 0,
        shortDescription: "Slap someone with a meme!",
        longDescription: "Generate a funny slapping meme by replying to someone or mentioning them",
        category: "fun",
        guide: {
            en: [
                "   {pn}: Reply to someone's message to slap them",
                "   {pn} @mention: Mention someone to slap them",
                "   {pn} [user ID]: Use someone's ID to slap them"
            ].join("\\n")
        }
    },

    langs: {
        en: {
            noTarget: "❌ Please reply to someone's message or mention/ID someone to slap them!",
            cannotSlapSelf: "😅 You can't slap yourself! That's just sad...",
            cannotSlapBot: "🤖 Hey! Don't slap me, I'm just doing my job!",
            generating: "🎭 Generating slap meme... Please wait! ✨",
            generationFailed: "❌ Failed to generate slap meme: {error}",
            apiError: "❌ Slap API is currently unavailable. Please try again later!",
            success: "💥 **SLAP SUCCESSFUL!** 👋\\n\\n{slapperName} just slapped {victimName}! 😂"
        }
    },

    onStart: async function ({ message, event, api, args, getLang, usersData }) {
        try {
            console.log('👋 [SLAP CMD] Slap command triggered');
            
            let targetUserID = null;
            let targetName = "Someone";
            let slapperID = event.senderID;
            let slapperName = "Someone";
            
            // Get slapper info
            try {
                const slapperData = await usersData.get(slapperID);
                slapperName = slapperData.name || "Someone";
            } catch (error) {
                console.log('⚠️ [SLAP CMD] Could not get slapper name:', error.message);
            }
            
            // Determine target from reply, mention, or ID
            if (event.messageReply) {
                // Replying to someone's message
                targetUserID = event.messageReply.senderID;
                console.log('📤 [SLAP CMD] Target from reply:', targetUserID);
                
            } else if (Object.keys(event.mentions || {}).length > 0) {
                // Someone was mentioned
                targetUserID = Object.keys(event.mentions)[0];
                console.log('👥 [SLAP CMD] Target from mention:', targetUserID);
                
            } else if (args[0] && /^\d+$/.test(args[0])) {
                // User ID provided as argument
                targetUserID = args[0];
                console.log('🆔 [SLAP CMD] Target from ID:', targetUserID);
                
            } else {
                // No target specified
                return message.reply(getLang("noTarget"));
            }
            
            // Validate target
            if (!targetUserID) {
                return message.reply(getLang("noTarget"));
            }
            
            // Prevent self-slapping
            if (targetUserID === slapperID) {
                return message.reply(getLang("cannotSlapSelf"));
            }
            
            // Prevent slapping the bot
            if (targetUserID === api.getCurrentUserID()) {
                return message.reply(getLang("cannotSlapBot"));
            }
            
            // Get target user info
            try {
                const targetData = await usersData.get(targetUserID);
                targetName = targetData.name || "Someone";
            } catch (error) {
                console.log('⚠️ [SLAP CMD] Could not get target name:', error.message);
            }
            
            console.log('🎯 [SLAP CMD] Slap participants:', {
                slapper: slapperName,
                victim: targetName,
                slapperID,
                targetUserID
            });
            
            // Send processing message
            const processingMsg = await message.reply(getLang("generating"));
            
            try {
                // Get profile picture URLs
                const slapperPfpUrl = `https://graph.facebook.com/${slapperID}/picture?width=200&height=200&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                const victimPfpUrl = `https://graph.facebook.com/${targetUserID}/picture?width=200&height=200&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                
                console.log('🖼️ [SLAP CMD] Profile picture URLs generated');
                
                // Call the external slap meme API
                const SLAP_API_URL = process.env.SLAP_API_URL || 'https://your-slap-api.render.com';
                
                console.log('🌐 [SLAP CMD] Using API:', SLAP_API_URL);
                    
                const response = await axios.post(`${SLAP_API_URL}/api/generate`, {
                    victimPfp: victimPfpUrl,
                    slapperPfp: slapperPfpUrl,
                    victimName: targetName,
                    slapperName: slapperName
                }, {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data.success === true) {
                    console.log('✅ [SLAP CMD] Slap meme generated successfully');
                    
                    // Convert base64 back to buffer and save temporarily
                    const imageBuffer = Buffer.from(response.data.data.image, 'base64');
                    const fs = require('fs');
                    const tempImagePath = `./temp_slap_${Date.now()}.png`;
                    
                    // Write buffer to temporary file
                    fs.writeFileSync(tempImagePath, imageBuffer);
                    
                    // Send the slap meme
                    await message.reply({
                        body: getLang("success", slapperName, targetName),
                        attachment: fs.createReadStream(tempImagePath)
                    });
                    
                    // Clean up temporary file after a delay
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(tempImagePath);
                        } catch (cleanupError) {
                            console.log('⚠️ [SLAP CMD] Could not clean up temp file:', cleanupError.message);
                        }
                    }, 5000);
                    
                    // Unsend the processing message
                    try {
                        await api.unsendMessage(processingMsg.messageID);
                    } catch (unsendError) {
                        console.log('⚠️ [SLAP CMD] Could not unsend processing message:', unsendError.message);
                    }
                    
                } else {
                    throw new Error(response.data.error || 'API returned error status');
                }
                
            } catch (apiError) {
                console.error('❌ [SLAP CMD] API call failed:', apiError.message);
                
                // Unsend processing message
                try {
                    await api.unsendMessage(processingMsg.messageID);
                } catch (unsendError) {
                    console.log('⚠️ [SLAP CMD] Could not unsend processing message:', unsendError.message);
                }
                
                // Send error message
                if (apiError.code === 'ECONNREFUSED' || apiError.message.includes('localhost')) {
                    await message.reply(getLang("apiError"));
                } else {
                    await message.reply(getLang("generationFailed", apiError.message));
                }
            }
            
        } catch (error) {
            console.error('❌ [SLAP CMD] Command error:', error);
            await message.reply(getLang("generationFailed", error.message));
        }
    }
};
