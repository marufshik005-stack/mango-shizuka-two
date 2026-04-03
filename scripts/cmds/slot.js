module.exports = {
  config: {
    name: "slot",
    version: "1.0",
    author: "zisan",
    shortDescription: {
      en: "Slot game",
    },
    longDescription: {
      en: "Slot game.",
    },
    category: "Game",
  },
  langs: {
    en: {
      invalid_amount: "⚠️ ᴘʟᴇᴀsᴇ ᴇɴᴛᴇʀ ᴀ ᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ ᴛᴏ ᴘʟᴀʏ!",
      not_enough_money: "❌ ɪɴsᴜꜰꜰɪᴄɪᴇɴᴛ ʙᴀʟᴀɴᴄᴇ! ʏᴏᴜ ɴᴇᴇᴅ ᴍᴏʀᴇ ᴍᴏɴᴇʏ.",
      spin_message: "🎰 sᴘɪɴɴɪɴɢ ᴛʜᴇ sʟᴏᴛs...",
      win_message: "%1",
      lose_message: "%1",
      jackpot_message: "%1",
    },
  },
  onStart: async function ({ args, message, event, envCommands, usersData, commandName, getLang }) {
    const { senderID } = event;
    const userData = await usersData.get(senderID);
    
    // Get the actual player name
    let userName;
    try {
      userName = await usersData.getName(senderID);
    } catch {
      userName = event.senderName || "Player";
    }
    
    const amount = parseInt(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return message.reply(getLang("invalid_amount"));
    }

    if (amount > userData.money) {
      return message.reply(getLang("not_enough_money"));
    }

    const slots = ["🎀", "💎", "💝", "🎮", "🎯", "🎪", "🎨", "🎭", "🎪"];
    const slot1 = slots[Math.floor(Math.random() * slots.length)];
    const slot2 = slots[Math.floor(Math.random() * slots.length)];
    const slot3 = slots[Math.floor(Math.random() * slots.length)];

    const winnings = calculateWinnings(slot1, slot2, slot3, amount);
    const newBalance = userData.money + winnings;

    await usersData.set(senderID, {
      money: newBalance,
      data: userData.data,
    });

    const messageText = getSpinResultMessage(slot1, slot2, slot3, winnings, getLang, userName, amount, newBalance);
    return message.reply(messageText);
  },
};

function calculateWinnings(slot1, slot2, slot3, betAmount) {
  if (slot1 === "🎀" && slot2 === "🎀" && slot3 === "🎀") {
    return betAmount * 10;
  } else if (slot1 === "💎" && slot2 === "💎" && slot3 === "💎") {
    return betAmount * 5;
  } else if (slot1 === slot2 && slot2 === slot3) {
    return betAmount * 3;
  } else if (slot1 === slot2 || slot1 === slot3 || slot2 === slot3) {
    return betAmount * 2;
  } else {
    return -betAmount;
  }
}

function getSpinResultMessage(slot1, slot2, slot3, winnings, getLang, userName, betAmount, newBalance) {
  const smallCaps = text => {
    const normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const small = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ';
    return text.split('').map(char => {
      const index = normal.indexOf(char);
      return index !== -1 ? small[index] : char;
    }).join('');
  };

  const formatMoney = (amount) => {
    if (amount >= 1e12) return `${(amount / 1e12).toFixed(1)}ᴛ`;
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}ʙ`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}ᴍ`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}ᴋ`;
    return amount.toString();
  };

  let multiplierInfo = '';
  if (slot1 === slot2 && slot2 === slot3) {
    const multiplier = slot1 === "🎀" ? "10x" : slot1 === "💎" ? "5x" : "3x";
    multiplierInfo = `\n✧ ᴍᴜʟᴛɪᴘʟɪᴇʀ: ${multiplier} ✧`;
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    multiplierInfo = `\n✧ ᴍᴜʟᴛɪᴘʟɪᴇʀ: 2x ✧`;
  }

  const playerInfo = `👤 ᴘʟᴀʏᴇʀ: ${userName}\n💫 ʙᴇᴛ ᴀᴍᴏᴜɴᴛ: $${formatMoney(betAmount)}`;
  const slotDisplay = `\n┏━━━━━━━━━┓\n┃ ${slot1} ┃ ${slot2} ┃ ${slot3} ┃\n┗━━━━━━━━━┛\n`;
  
  if (winnings > 0) {
    return `${playerInfo}\n${slotDisplay}\n✨ ᴄᴏɴɢʀᴀᴛs ʏᴏᴜ ᴡᴏɴ: $${formatMoney(winnings)}${multiplierInfo}\n💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${formatMoney(newBalance)}`;
  } else {
    return `${playerInfo}\n${slotDisplay}\n💔 sᴏʀʀʏ ʏᴏᴜ ʟᴏsᴛ: $${formatMoney(-winnings)}\n💰 ʀᴇᴍᴀɪɴɪɴɢ ʙᴀʟᴀɴᴄᴇ: $${formatMoney(newBalance)}`;
  }
}
