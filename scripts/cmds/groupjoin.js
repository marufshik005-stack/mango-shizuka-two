module.exports = {
  config: {
    name: "groupjoin",
    aliases: ["gj", "gjoin", "grouplist"],
    version: "1.0",
    author: "zisan",
    countDown: 5,
    role: 2, // Bot admin only
    shortDescription: "List groups and join by replying with serial number",
    longDescription: "Displays all groups with serial numbers. Reply with a number to join that group.",
    category: "admin",
    guide: {
      en: "{pn} - Show all groups with serial numbers\nReply with a number to join that group"
    }
  },

  onStart: async function ({ api, message, event }) {
    try {
      // Get all thread lists including groups
      const threads = await api.getThreadList(100, null, ["INBOX"]);
      const groupThreads = threads.filter(thread => thread.isGroup);

      if (groupThreads.length === 0) {
        return message.reply("⚠️ The bot is currently not in any groups.");
      }

      // Create the group list message
      let msg = `🤖 **GROUP LIST** 🤖\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📊 Total Groups: ${groupThreads.length}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Prepare groups data for onReply
      const groupsData = [];
      
      groupThreads.forEach((thread, index) => {
        const serialNumber = index + 1;
        const name = thread.name || "Unnamed Group";
        const tid = thread.threadID;
        const members = thread.participantIDs?.length || "Unknown";
        
        // Add to groups data array
        groupsData.push({
          serial: serialNumber,
          name: name,
          tid: tid,
          members: members
        });

        // Add to message
        msg += `${serialNumber}. 📝 ${name}\n`;
        msg += `   🆔 ID: ${tid}\n`;
        msg += `   👥 Members: ${members}\n`;
        msg += `   ─────────────────────\n`;
      });

      msg += `\n💡 **How to Join:**\n`;
      msg += `Reply to this message with the serial number (1-${groupThreads.length}) to join that group.\n`;
      msg += `\nExample: Reply with "5" to join group #5`;

      // Send message and set up onReply handler
      message.reply(msg, (err, info) => {
        if (err) {
          console.error("Error sending group list:", err);
          return message.reply("❌ Failed to send group list.");
        }

        // Set up the reply handler with groups data
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "groupjoin",
          messageID: info.messageID,
          author: event.senderID,
          groupsData: groupsData
        });
      });

    } catch (error) {
      console.error("GroupJoin command error:", error);
      return message.reply("❌ Failed to fetch group list. Error: " + error.message);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { author, commandName, groupsData } = Reply;

    // Check if the reply is from the same user who requested the list
    if (event.senderID !== author || commandName !== "groupjoin") {
      return;
    }

    // Check if groups data exists
    if (!groupsData || !Array.isArray(groupsData)) {
      return message.reply("❌ Group data not found. Please run the command again.");
    }

    // Get the user's reply (should be a number)
    const userReply = event.body.trim();
    const selectedNumber = parseInt(userReply, 10);

    // Validate the input
    if (isNaN(selectedNumber)) {
      return message.reply("❌ Please reply with a valid number.\n💡 Example: Reply with '3' to join group #3");
    }

    if (selectedNumber < 1 || selectedNumber > groupsData.length) {
      return message.reply(`❌ Invalid number. Please choose between 1 and ${groupsData.length}.`);
    }

    // Find the selected group
    const selectedGroup = groupsData.find(group => group.serial === selectedNumber);
    
    if (!selectedGroup) {
      return message.reply("❌ Selected group not found. Please try again.");
    }

    try {
      // Add the user to the selected group
      await api.addUserToGroup(event.senderID, selectedGroup.tid);
      
      // Success message
      const successMsg = `✅ **Successfully Added!**\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `📝 Group: ${selectedGroup.name}\n` +
                        `🆔 Group ID: ${selectedGroup.tid}\n` +
                        `👥 Members: ${selectedGroup.members}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `🎉 You have been added to the group!`;
      
      message.reply(successMsg);
      
      // Clean up the reply handler
      global.GoatBot.onReply.delete(event.messageID);

    } catch (error) {
      console.error("Error adding user to group:", error);
      
      let errorMsg = `❌ **Failed to Join Group**\n`;
      errorMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      errorMsg += `📝 Group: ${selectedGroup.name}\n`;
      errorMsg += `🆔 Group ID: ${selectedGroup.tid}\n`;
      errorMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      // Provide specific error messages based on common issues
      if (error.message.includes("User not found") || error.code === 1545041) {
        errorMsg += `❌ **Reason:** User account not found or deactivated.\n`;
      } else if (error.message.includes("Cannot add user") || error.code === 1545040) {
        errorMsg += `❌ **Reason:** Cannot add user to this group.\n`;
        errorMsg += `💡 **Possible causes:**\n`;
        errorMsg += `• You've blocked the group or bot\n`;
        errorMsg += `• Group has restricted adding members\n`;
        errorMsg += `• You're already in the group\n`;
        errorMsg += `• Bot doesn't have permission to add users\n`;
      } else if (error.message.includes("Thread not found") || error.code === 1545001) {
        errorMsg += `❌ **Reason:** Group no longer exists or bot was removed.\n`;
      } else {
        errorMsg += `❌ **Reason:** ${error.message || "Unknown error"}\n`;
      }
      
      errorMsg += `\n💡 **Try:**\n`;
      errorMsg += `• Check if you're already in the group\n`;
      errorMsg += `• Make sure your account is active\n`;
      errorMsg += `• Contact group admin for manual invite`;
      
      message.reply(errorMsg);
    }
  }
};