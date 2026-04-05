module.exports = {
  config: {
    name: "slot",
    version: "1.3",
    author: "zisan",
    shortDescription: {
      en: "Heart slots with 2x/3x payouts",
    },
    longDescription: {
      en: "Slot game: 2 matching hearts = 2x, 3 matching hearts = 3x.",
    },
    category: "Game",
  },
  langs: {
    en: {
      invalid_amount: "⚠️ ᴘʟᴇᴀsᴇ ᴇɴᴛᴇʀ ᴀ ᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ ᴛᴏ ᴘʟᴀʏ!",
      not_enough_money: "❌ ɪɴsᴜꜰꜰɪᴄɪᴇɴᴛ ʙᴀʟᴀɴᴄᴇ! ʏᴏᴜ ɴᴇᴇᴅ ᴍᴏʀᴇ ᴍᴏɴᴇʏ.",
    },
  },
  onStart: async function ({ args, message, event, usersData, getLang }) {
    const { senderID } = event;
    const userData = await usersData.get(senderID);
    
    let userName;
    try {
      userName = await usersData.getName(senderID);
    } catch {
      userName = event.senderName || "Player";
    }

    const parseAmount = (input) => {
      if (!input) return NaN;
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

    // 5 symbols for high win probability
    const slots = ["🤍", "🧡", "💛", "💚", "❤"];
    const slot1 = slots[Math.floor(Math.random() * slots.length)];
    const slot2 = slots[Math.floor(Math.random() * slots.length)];
    const slot3 = slots[Math.floor(Math.random() * slots.length)];

    const winnings = calculateWinnings(slot1, slot2, slot3, amount);
    const newBalance = userData.money + winnings;

    await usersData.set(senderID, {
      money: newBalance,
      data: userData.data,
    });

    const messageText = getSpinResultMessage(slot1, slot2, slot3, winnings, userName, amount, newBalance);
    return message.reply(messageText);
  },
};

function calculateWinnings(slot1, slot2, slot3, betAmount) {
  // 3 Hearts = 3x Payout
  if (slot1 === slot2 && slot2 === slot3) {
    return betAmount * 3;
  } 
  // 2 Hearts = 2x Payout
  else if (slot1 === slot2 || slot1 === slot3 || slot2 === slot3) {
    return betAmount * 2;
  } 
  // No match = Loss
  else {
    return -betAmount;
  }
}

function getSpinResultMessage(slot1, slot2, slot3, winnings, userName, betAmount, newBalance) {
  const formatMoney = (amount) => {
    const units = ["", "ᴋ", "ᴍ", "ʙ", "ᴛ", "ǫ"];
    let unit = 0, n = Math.abs(Number(amount));
    while (n >= 1000 && unit < units.length - 1) { n /= 1000; unit++; }
    return `${parseFloat(n.toFixed(2))}${units[unit]}`;
  };

  let multiplierInfo = '';
  if (slot1 === slot2 && slot2 === slot3) {
    multiplierInfo = `\n✧ ᴍᴜʟᴛɪᴘʟɪᴇʀ: 3x ✧`;
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    multiplierInfo = `\n✧ ᴍᴜʟᴛɪᴘʟɪᴇʀ: 2x ✧`;
  }

  const playerInfo = `👤 ᴘʟᴀʏᴇʀ: ${userName}\n💫 ʙᴇᴛ ᴀᴍᴏᴜɴᴛ: $${formatMoney(betAmount)}`;
  const slotDisplay = `\n┏━━━━━━━━━┓\n┃ ${slot1} ┃ ${slot2} ┃ ${slot3} ┃\n┗━━━━━━━━━┛\n`;
  
  if (winnings > 0) {
    return `${playerInfo}\n${slotDisplay}\n✨ ᴄᴏɴɢʀᴀᴛs ʏᴏᴜ ᴡᴏɴ: $${formatMoney(winnings)}${multiplierInfo}\n💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${formatMoney(newBalance)}`;
  } else {
    return `${playerInfo}\n${slotDisplay}\n💔 sᴏʀʀʏ ʏᴏᴜ ʟᴏsᴛ: $${formatMoney(Math.abs(winnings))}\n💰 ʀᴇᴍᴀɪɴɪɴɢ ʙᴀʟᴀɴᴄᴇ: $${formatMoney(newBalance)}`;
  }
}
