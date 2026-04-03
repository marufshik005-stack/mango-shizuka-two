const JanTeach = require('../../database/models/janteach');
const stringSimilarity = require('string-similarity');

module.exports = {
  config: {
    name: "jan",
    aliases: ["j"],
    version: "1.0",
    author: "Your Name",
    countDown: 5,
    role: 0,
    shortDescription: "Teach Jan new responses",
    longDescription: "Teach Jan new responses and let it learn from conversations",
    category: "ai",
    guide: {
      vi: "{p}jan teach <trigger> - <response1 | response2 | ...>",
      en: "{p}jan teach <trigger> - <response1 | response2 | ...>"
    }
  },

  onStart: async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    if (args[0] === "teach") {
      // Remove the "teach" from args and join the rest
      const input = args.slice(1).join(" ");
      
      // Split by the first occurrence of " - "
      const separatorIndex = input.indexOf(" - ");
      if (separatorIndex === -1) {
        return api.sendMessage("❌ Invalid format. Use: jan teach <trigger> - <response1 | response2 | ...>", threadID, messageID);
      }

      const trigger = input.slice(0, separatorIndex).trim().toLowerCase();
      const responseStr = input.slice(separatorIndex + 3).trim(); // +3 to skip " - "
      
      if (!trigger || !responseStr) {
        return api.sendMessage("❌ Invalid format. Use: jan teach <trigger> - <response1 | response2 | ...>", threadID, messageID);
      }

      const responses = responseStr.split("|").map(r => r.trim());
      
      try {
        // Check if trigger already exists for this thread
        let janEntry = await JanTeach.findOne({ trigger: trigger, threadID });
        
        if (janEntry) {
          // Add new responses to existing ones
          janEntry.responses = [...new Set([...janEntry.responses, ...responses])];
          await janEntry.save();
          return api.sendMessage("✅ Added new responses to existing trigger!", threadID, messageID);
        }
        
        // Create new entry
        janEntry = new JanTeach({
          trigger,
          responses,
          threadID
        });
        
        await janEntry.save();
        return api.sendMessage("✅ Successfully taught Jan a new response!", threadID, messageID);
      } catch (error) {
        console.error(error);
        return api.sendMessage("❌ Error while teaching Jan!", threadID, messageID);
      }
    }

    // If not teaching, try to find a response
    try {
      const userMessage = args.join(" ").toLowerCase();
      
      // Check for exact match in current database
      let janEntry = await JanTeach.findOne({
        trigger: userMessage,
        threadID
      });

      if (janEntry) {
        // Randomly select one response
        const response = janEntry.responses[Math.floor(Math.random() * janEntry.responses.length)];
        return api.sendMessage(response, threadID, messageID);
      }

      // If no exact match, find the closest match
      const allEntries = await JanTeach.find({ threadID });
      const triggers = allEntries.map(entry => entry.trigger);
      
      if (triggers.length > 0) {
        const { bestMatch } = stringSimilarity.findBestMatch(userMessage, triggers);
        
        if (bestMatch.rating > 0.6) { // Similarity threshold
          const closestMatch = await JanTeach.findOne({
            trigger: bestMatch.target,
            threadID
          });
          
          const response = closestMatch.responses[Math.floor(Math.random() * closestMatch.responses.length)];
          return api.sendMessage(response, threadID, messageID);
        }
      }

      // If no good match found
      return api.sendMessage("I don't know how to respond to that yet. Teach me using 'jan teach'!", threadID, messageID);
      
    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Error while processing response!", threadID, messageID);
    }
  },

  // onChat: DISABLED TO PREVENT DUPLICATE REPLIES WITH teach.js
  // onChat: async function({ api, event }) {
  //   const { threadID, messageID, body } = event;
  //   
  //   if (!body || body.startsWith("jan")) return; // Ignore empty messages and jan commands
  //   
  //   try {
  //     const userMessage = body.toLowerCase();
  //     
  //     // Check for exact match
  //     let janEntry = await JanTeach.findOne({
  //       trigger: userMessage,
  //       threadID
  //     });
  // 
  //     if (janEntry) {
  //       // Prevent double replies by checking lastUsed
  //       const now = new Date();
  //       if (janEntry.lastUsed && (now - janEntry.lastUsed) < 5000) { // 5 seconds cooldown
  //         return;
  //       }
  //       
  //       // Update lastUsed
  //       janEntry.lastUsed = now;
  //       await janEntry.save();
  //       
  //       // Randomly select one response
  //       const response = janEntry.responses[Math.floor(Math.random() * janEntry.responses.length)];
  //       return api.sendMessage(response, threadID, messageID);
  //     }
  // 
  //     // For non-exact matches, we'll use a lower probability of responding
  //     if (Math.random() < 0.3) { // 30% chance to respond to similar messages
  //       const allEntries = await JanTeach.find({ threadID });
  //       const triggers = allEntries.map(entry => entry.trigger);
  //       
  //       if (triggers.length > 0) {
  //         const { bestMatch } = stringSimilarity.findBestMatch(userMessage, triggers);
  //         
  //         if (bestMatch.rating > 0.7) { // Higher threshold for random chats
  //           const closestMatch = await JanTeach.findOne({
  //             trigger: bestMatch.target,
  //             threadID
  //           });
  //           
  //           // Update lastUsed
  //           closestMatch.lastUsed = new Date();
  //           await closestMatch.save();
  //           
  //           const response = closestMatch.responses[Math.floor(Math.random() * closestMatch.responses.length)];
  //           return api.sendMessage(response, threadID, messageID);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
};