module.exports = {
  config: {
    name: "supportgc",
    aliases: ["support", "maingroup", "helpgroup"],
    version: "2.0",
    author: "Shizuka",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Join the support group chat",
      vi: "Tham gia nhóm hỗ trợ"
    },
    longDescription: {
      en: "Join the official support group chat for help and assistance",
      vi: "Tham gia nhóm hỗ trợ chính thức để được giúp đỡ"
    },
    category: "info",
    guide: {
      en: "{pn} - Join support group automatically",
      vi: "{pn} - Tham gia nhóm hỗ trợ tự động"
    }
  },

  onStart: async function ({ api, event, threadsData, getLang, message }) {
    const supportGroupThreadID = "2"; // Replace with your support group thread ID
    const botID = api.getCurrentUserID();

    try {
      const { members } = await threadsData.get(supportGroupThreadID);

      // Check if the user is already a member of the support group
      const senderName = event.senderName || (await api.getUserInfo(event.senderID))[event.senderID].name;
      const userAlreadyInGroup = members.some(
        member => member.userID === event.senderID && member.inGroup
      );

      if (userAlreadyInGroup) {
        // Reply with a beautiful styled message for already members
        const alreadyInGroupMessage = `╔══════════════════════════╗
║    🎯 SUPPORT GROUP      ║
╚══════════════════════════╝

✅ আপনি ইতিমধ্যেই Support Group এর সদস্য!

📋 Group Information:
• Name: lazy legend
• Status: ✅ Active Member
• Your ID: ${event.senderID}
• Current Group: ${event.threadID}

💡 যদি আপনার group suspend হয়ে থাকে:
• Support group এ আপনার সমস্যা বলুন
• Group ID: ${event.threadID}
• Admin দের সাথে যোগাযোগ করুন

🔗 Direct Support: m.me/[AdminProfile]

🌟 ধন্যবাদ Shizuka Bot ব্যবহার করার জন্য! 🌟`;
        return message.reply(alreadyInGroupMessage);
      }

      // Add the user to the support group
      await api.addUserToGroup(event.senderID, supportGroupThreadID);

      // Reply with a beautiful styled success message
      const successMessage = `╔══════════════════════════╗
║    🎉 SUCCESS ADDED     ║
╚══════════════════════════╝

✅ আপনাকে সফলভাবে Support Group এ যুক্ত করা হয়েছে!

🎯 Welcome to Shizuka Bot Support!

📋 What you can do:
• 💬 Report bugs and issues
• 💡 Request new features  
• 🆘 Get help with commands
• 🔧 Technical support
• 📈 Bot updates & announcements

🚀 Special Services:
• Group unban/unsuspend requests
• Custom command development
• Premium features access
• 24/7 bot hosting support

⚠️ Important Rules:
• Be respectful to all members
• No spam or inappropriate content
• Use proper language
• Follow admin instructions

🕰️ Support Hours: 24/7 Available
📞 Response Time: 1-6 hours

🌟 Thank you for joining! Happy to help! 🌟`;
      return message.reply(successMessage);
    } catch (error) {
      // Handle any errors that occur during the process

      // Reply with a beautiful styled failure message with instructions
      const senderName = event.senderName || (await api.getUserInfo(event.senderID))[event.senderID].name;
      const failedMessage = `╔══════════════════════════╗
║    ❌ UNABLE TO ADD      ║
╚══════════════════════════╝

⚠️ আপনাকে Support Group এ যুক্ত করতে পারিনি!

🔧 সমাধানের উপায়:
• 👤 Bot কে Friend Request পাঠান
• 🔓 আপনার Profile Unlock করুন
• 🔄 কিছুক্ষণ পর আবার চেষ্টা করুন
• 📱 Message Settings চেক করুন

🔗 বিকল্প মাধ্যম:
• Support Link: https://m.me/j/AbaOx18fo5rF5IS2/
                    

📌 আপনার তথ্য:
• Your Name: ${senderName}
• Your ID: ${event.senderID}
• Current Group: ${event.threadID}
• Time: ${new Date().toLocaleString()}

📞 জরুরি সাহায্যের জন্য Admin এর সাথে যোগাযোগ করুন!

🌟 ধন্যবাদ আপনার ধৈর্য্যের জন্য! 🌟`;
      console.error("Error adding user to support group:", error);
      return message.reply(failedMessage);
    }
  }
};
