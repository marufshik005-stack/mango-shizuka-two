const axios = require("axios");

// লিমিট এবং কুলডাউন সেভ রাখার জন্য Map
const cooldowns = new Map(); 
const dailyUsage = new Map(); 

module.exports = {
  config: {
    name: "slot",
    version: "1.5",
    author: "zisan",
    countDown: 12, // ফ্রেমওয়ার্কের ডিফল্ট কুলডাউন
    role: 0,
    shortDescription: {
      en: "Heart slots with 2x/3x payouts",
      bn: "হার্ট স্লট গেম (২গুন/৩গুন লাভ)"
    },
    category: "Game",
    guide: {
      en: "{pn} [amount/all/k/m]",
      bn: "{pn} [পরিমাণ/all/k/m]"
    }
  },

  langs: {
    en: {
      invalid_amount: "⚠️ ᴘʟᴇᴀsᴇ ᴇɴᴛᴇʀ ᴀ ᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ ᴛᴏ ᴘʟᴀʏ!",
      not_enough_money: "❌ ɪɴsᴜꜰꜰɪᴄɪᴇɴᴛ ʙᴀʟᴀɴᴄᴇ! ʏᴏᴜ ɴᴇᴇᴅ ᴍᴏʀᴇ ᴍᴏɴᴇʏ.",
      cooldown: "⏳ ᴇᴀsʏ ʙᴀʙʏ! ᴡᴀɪᴛ %1s ʙᴇꜰᴏʀᴇ sᴘɪɴɴɪɴɢ ᴀɢᴀɪɴ.",
      limit_reached: "❌ ᴅᴀɪʟʏ ʟɪᴍɪᴛ ʀᴇᴀᴄʜᴇᴅ! ʏᴏᴜ ᴄᴀɴ ᴘʟᴀʏ 20 ᴛɪᴍᴇs ᴘᴇʀ ᴅᴀʏ. ᴄᴏᴍᴇ ʙᴀᴄᴋ ᴛᴏᴍᴏʀʀᴏᴡ!"
    },
    bn: {
      invalid_amount: "⚠️ দয়া করে সঠিক টাকার পরিমাণ লিখুন!",
      not_enough_money: "❌ আপনার যথেষ্ট ব্যালেন্স নেই!",
      cooldown: "⏳ একটু শান্ত হও বেবি! %1 সেকেন্ড পর আবার ট্রাই করো।",
      limit_reached: "❌ আজকের মতো তোমার ২০ বার খেলার লিমিট শেষ! কালকে আবার এসো।"
    }
  },

  onStart: async function ({ args, message, event, usersData, getLang }) {
    const { senderID } = event;
    const now = Date.now();

    // ============= ১২ সেকেন্ড কুলডাউন চেক =============
    if (cooldowns.has(senderID)) {
      const expirationTime = cooldowns.get(senderID) + 12000;
      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        return message.reply(getLang("cooldown", timeLeft));
      }
    }

    // ============= দৈনিক ২০ বার লিমিট চেক =============
    const today = new Date().toDateString(); 
    let userLimit = dailyUsage.get(senderID) || { count: 0, date: today };

    if (userLimit.date !== today) {
      userLimit = { count: 0, date: today };
    }

    if (userLimit.count >= 20) {
      return message.reply(getLang("limit_reached"));
    }

    const userData = await usersData.get(senderID);
    
    // ইউজারনেম বের করা
    let userName;
    try {
      userName = await usersData.getName(senderID);
    } catch {
      userName = event.senderName || "Player";
    }

    // এমাউন্ট পার্স করার ফাংশন (1k, 1m সাপোর্ট করবে)
    const parseAmount = (input) => {
      if (!input) return NaN;
      if (input.toLowerCase() === "all") return userData.money;
      const regex = /^([\d.]+)\s*([kKmMbBtT]?)$/;
      const match = String(input).match(regex);
      if (!match) return NaN;

      let num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'k': num *= 1000; break;
        case 'm': num *= 1000000; break;
        case 'b': num *= 1000000000; break;
        case 't': num *= 1000000000000; break;
      }
      return Math.floor(num);
    };

    const amount = parseAmount(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return message.reply(getLang("invalid_amount"));
    }

    if (amount > userData.money) {
      return message.reply(getLang("not_enough_money"));
    }

    // লিমিট এবং কুলডাউন আপডেট
    cooldowns.set(senderID, now);
    userLimit.count += 1;
    dailyUsage.set(senderID, userLimit);

    // স্লট সিম্বল (৫টি সিম্বল হলে জেতার সম্ভাবনা ব্যালেন্সড থাকে)
    const slots = ["🤍", "🧡", "💛", "💚", "❤"];
    const slot1 = slots[Math.floor(Math.random() * slots.length)];
    const slot2 = slots[Math.floor(Math.random() * slots.length)];
    const slot3 = slots[Math.floor(Math.random() * slots.length)];

    const winnings = calculateWinnings(slot1, slot2, slot3, amount);
    const newBalance = userData.money + winnings;

    // ডাটাবেজে টাকা আপডেট করা
    await usersData.set(senderID, {
      money: newBalance,
      data: userData.data,
    });

    // রেজাল্ট মেসেজ পাঠানো
    const messageText = getSpinResultMessage(slot1, slot2, slot3, winnings, userName, amount, newBalance, userLimit.count);
    return message.reply(messageText);
  },
};

// জেতার টাকা হিসাব করার ফাংশন
function calculateWinnings(slot1, slot2, slot3, betAmount) {
  if (slot1 === slot2 && slot2 === slot3) {
    return betAmount * 3; // ৩টা মিললে ৩ গুন
  } else if (slot1 === slot2 || slot1 === slot3 || slot2 === slot3) {
    return betAmount * 2; // ২টা মিললে ২ গুন
  } else {
    return -betAmount; // না মিললে লস
  }
}

// রেজাল্ট মেসেজ ফরম্যাট করার ফাংশন
function getSpinResultMessage(slot1, slot2, slot3, winnings, userName, betAmount, newBalance, count) {
  const formatMoney = (amount) => {
    const units = ["", "ᴋ", "ᴍ", "ʙ", "ᴛ", "ǫ"];
    let unit = 0, n = Math.abs(Number(amount));
    while (n >= 1000 && unit < units.length - 1) { n /= 1000; unit++; }
    return `${parseFloat(n.toFixed(2))}${units[unit]}`;
  };

  let multiplierInfo = (slot1 === slot2 && slot2 === slot3) ? `\n✧ ᴍᴜʟᴛɪᴘʟɪᴇʀ: 3x ✧` : 
                       (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) ? `\n✧ ᴍᴜʟᴛɪᴘʟɪᴇʀ: 2x ✧` : '';

  const playerInfo = `👤 ᴘʟᴀʏᴇʀ: ${userName}\n💫 ʙᴇᴛ ᴀᴍᴏᴜɴᴛ: $${formatMoney(betAmount)}\n📊 ᴛᴏᴅᴀʏ's ʟɪᴍɪᴛ: ${count}/20`;
  const slotDisplay = `\n┏━━━━━━━━━┓\n┃ ${slot1} ┃ ${slot2} ┃ ${slot3} ┃\n┗━━━━━━━━━┛\n`;
  
  if (winnings > 0) {
    return `${playerInfo}\n${slotDisplay}\n✨ ᴄᴏɴɢʀᴀᴛs ʏᴏᴜ ᴡᴏɴ: $${formatMoney(winnings)}${multiplierInfo}\n💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${formatMoney(newBalance)}`;
  } else {
    return `${playerInfo}\n${slotDisplay}\n💔 sᴏʀʀʏ ʏᴏᴜ ʟᴏsᴛ: $${formatMoney(Math.abs(winnings))}\n💰 ʀᴇᴍᴀɪɴɪɴɢ ʙᴀʟᴀɴᴄᴇ: $${formatMoney(newBalance)}`;
  }
}
