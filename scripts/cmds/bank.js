const moment = require("moment-timezone");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

// ── রিসিট বা ভাউচার জেনারেট করার ফাংশন ──
async function renderTxnReceipt({
  type,
  amount,
  bankBalance,
  userName,
  userID
}) {
  const W = 1200, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background logic for receipt
  try {
    const bg = await loadImage("https://i.postimg.cc/ryHfwpLJ/ezgif-22bfaf4827830f.jpg");
    ctx.drawImage(bg, 0, 0, W, H);
  } catch (e) {
    ctx.fillStyle = "#ffd6e7";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = "rgba(255, 214, 231, 0.85)";
  ctx.fillRect(0, 0, W, H);

  // Paper card
  const cardX = 60, cardY = 40, cardW = W - 120, cardH = H - 80, radius = 22;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.lineTo(cardX + cardW - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
  ctx.lineTo(cardX + cardW, cardY + cardH - radius);
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
  ctx.lineTo(cardX + radius, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
  ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
  ctx.fill();
  ctx.restore();

  // Header ribbon
  ctx.fillStyle = "#ff3f93";
  ctx.fillRect(cardX, cardY + 18, cardW, 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Shizuka Bank", cardX + 32, cardY + 56);

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff3f93";
  ctx.font = "bold 40px Arial";
  ctx.fillText(`${type} Receipt`, cardX + cardW / 2, cardY + 130);

  // Details
  const fmt = n => n.toLocaleString("en-US");
  ctx.textAlign = "left";
  ctx.fillStyle = "#111";
  ctx.font = "bold 26px Arial";
  const sx = cardX + 60, sy = cardY + 190, lh = 48;
  ctx.fillText("Account Holder", sx, sy);
  ctx.fillText("Amount", sx, sy + lh * 2);

  ctx.textAlign = "right";
  ctx.fillStyle = "#444";
  ctx.font = "24px Arial";
  ctx.fillText(userName, cardX + cardW - 60, sy);
  ctx.fillStyle = type === "Deposit" ? "#1a9b34" : "#c03535";
  ctx.font = "bold 30px Arial";
  ctx.fillText(`$${fmt(amount)}`, cardX + cardW - 60, sy + lh * 2);

  return canvas.toBuffer("image/png");
}

module.exports = {
  config: {
    name: "bank",
    aliases: ["b"],
    version: "1.5",
    author: "𝐙ɪsᴀ𝐍",
    countDown: 5,
    role: 0,
    category: "economy",
    guide: {
      en: "{pn} balance | {pn} deposit <amount> | {pn} withdraw <amount> | {pn} transfer <@tag> <amount> | {pn} history"
    }
  },

  langs: {
    en: {
      depositSuccess: "✅ Successfully deposited %1$ to bank!",
      withdrawSuccess: "✅ Successfully withdrew %1$ from bank!",
      transferSuccess: "✅ Successfully transferred %1$ to %2!",
      transferReceived: "💰 You received %1$ from %2!",
      insufficientFunds: "❌ Insufficient funds! You only have %1$",
      insufficientBankFunds: "❌ Insufficient bank funds! You only have %1$ in bank",
      invalidAmount: "❌ Invalid amount!",
      bankBalance: "🏦 Bank Balance: %1$",
      walletBalance: "💳 Wallet Balance: %1$",
      noTransactions: "📋 No transactions yet",
      transactionHistory: "📋 Recent transaction history:",
      transactionItem: "• %1 - %2$ (%3)",
      missingAmount: "❌ Please enter amount!",
      missingTarget: "❌ Please tag the person to transfer money to!",
      cannotTransferSelf: "❌ Cannot transfer money to yourself!",
      userNotFound: "❌ User not found!"
    }
  },

  onStart: async function ({ message, args, event, usersData, getLang }) {
    const { senderID } = event;
    const action = args[0]?.toLowerCase();

    let economyData = await usersData.get(senderID, "data.economy");
    if (!economyData) {
      economyData = {
        bankBalance: 0,
        investments: {},
        transactions: [],
        lastDailyReward: "",
        bankLevel: 1,
        investmentLevel: 1
      };
      await usersData.set(senderID, economyData, "data.economy");
    }

    const userMoney = await usersData.get(senderID, "money");

    switch (action) {
      case "deposit":
      case "d": {
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) return message.reply(getLang("invalidAmount"));
        if (amount > userMoney) return message.reply(getLang("insufficientFunds", userMoney));

        await usersData.set(senderID, { money: userMoney - amount });
        await usersData.set(senderID, economyData.bankBalance + amount, "data.economy.bankBalance");

        const depositTransaction = {
          type: "deposit", amount: amount, description: "Bank Deposit",
          date: moment().format("DD/MM/YYYY HH:mm:ss"), relatedUser: null
        };
        economyData.transactions.unshift(depositTransaction);
        if (economyData.transactions.length > 20) economyData.transactions.pop();
        await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

        try {
          const holderName = await usersData.getName(senderID) || senderID;
          const buf = await renderTxnReceipt({ type: "Deposit", amount, bankBalance: economyData.bankBalance + amount, userName: holderName, userID: senderID });
          const outPath = path.join(__dirname, "cache", `bank_txn_${senderID}_deposit.png`);
          await fs.ensureDir(path.dirname(outPath)); await fs.writeFile(outPath, buf);
          await message.reply({ attachment: fs.createReadStream(outPath), body: getLang("depositSuccess", amount) });
          try { await fs.remove(outPath); } catch (e) {}
        } catch (e) { message.reply(getLang("depositSuccess", amount)); }
        break;
      }

      case "withdraw":
      case "w": {
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) return message.reply(getLang("invalidAmount"));
        if (amount > economyData.bankBalance) return message.reply(getLang("insufficientBankFunds", economyData.bankBalance));

        await usersData.set(senderID, { money: userMoney + amount });
        await usersData.set(senderID, economyData.bankBalance - amount, "data.economy.bankBalance");

        const withdrawTransaction = {
          type: "withdraw", amount: amount, description: "Bank Withdrawal",
          date: moment().format("DD/MM/YYYY HH:mm:ss"), relatedUser: null
        };
        economyData.transactions.unshift(withdrawTransaction);
        if (economyData.transactions.length > 20) economyData.transactions.pop();
        await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

        try {
          const holderName = await usersData.getName(senderID) || senderID;
          const buf = await renderTxnReceipt({ type: "Withdrawal", amount, bankBalance: economyData.bankBalance - amount, userName: holderName, userID: senderID });
          const outPath = path.join(__dirname, "cache", `bank_txn_${senderID}_withdraw.png`);
          await fs.ensureDir(path.dirname(outPath)); await fs.writeFile(outPath, buf);
          await message.reply({ attachment: fs.createReadStream(outPath), body: getLang("withdrawSuccess", amount) });
          try { await fs.remove(outPath); } catch (e) {}
        } catch (e) { message.reply(getLang("withdrawSuccess", amount)); }
        break;
      }

      case "balance":
      case "b": {
        const bankBal = economyData.bankBalance || 0;
        const W = 1000, H = 630;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext("2d");

        const roundRect = (x, y, w, h, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        };

        // ── 🎨 PREMIUM NEUTRAL & BLACK PALETTES ──
        const gradients = [
          ["#000000", "#1a1a1a", "#000000"], // Pure Matte Black
          ["#1c1c1c", "#333333", "#1c1c1c"], // Dark Charcoal
          ["#232526", "#414345", "#232526"], // Titanium Gray
          ["#0f2027", "#203a43", "#2c5364"], // Deep Midnight Blue
          ["#131414", "#242526", "#131414"]  // Obsidian Black
        ];
        const randomGrad = gradients[Math.floor(Math.random() * gradients.length)];
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, randomGrad[0]);
        grad.addColorStop(0.5, randomGrad[1]);
        grad.addColorStop(1, randomGrad[2]);
        
        ctx.fillStyle = grad;
        roundRect(0, 0, W, H, 35);
        ctx.fill();

        // ── 💎 HIGH-VISIBILITY STYLISH HEXAGON TEXTURE ──
        ctx.save();
        ctx.beginPath();
        roundRect(0, 0, W, H, 35);
        ctx.clip(); 

        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)"; // স্পষ্ট করে তোলার জন্য হাই ভিজিবিলিটি
        ctx.lineWidth = 1.5;
        const size = 35; 
        for (let y = 0; y < H + size; y += size * 0.86) {
          for (let x = 0; x < W + size; x += size * 1.5) {
            let offset = (Math.floor(y / (size * 0.86)) % 2) * (size * 0.75);
            ctx.beginPath();
            ctx.moveTo(x + offset, y);
            ctx.lineTo(x + offset + size * 0.5, y + size * 0.25);
            ctx.lineTo(x + offset + size * 0.5, y + size * 0.75);
            ctx.lineTo(x + offset, y + size);
            ctx.lineTo(x + offset - size * 0.5, y + size * 0.75);
            ctx.lineTo(x + offset - size * 0.5, y + size * 0.25);
            ctx.closePath();
            ctx.stroke();
          }
        }
        ctx.restore();

        // ── Content ──
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 32px Helvetica, Arial, sans-serif";
        ctx.fillText("SHIZUKA BANK", 60, 80);
        ctx.font = "18px Helvetica, Arial, sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillText("PREMIUM ELITE", 60, 110);

        // Chip
        const chipGrad = ctx.createLinearGradient(60, 180, 140, 236);
        chipGrad.addColorStop(0, "#d4af37"); chipGrad.addColorStop(1, "#f1d592");
        ctx.fillStyle = chipGrad;
        roundRect(60, 180, 85, 60, 10);
        ctx.fill();

        // Balance
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "17px Helvetica, Arial, sans-serif";
        ctx.fillText("TOTAL BALANCE", 60, 310);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 65px Helvetica, Arial, sans-serif";
        ctx.fillText(`$${bankBal.toLocaleString()}`, 55, 380);

        // Card Number
        const uid16 = String(senderID).replace(/\D/g, "").padStart(16, "0").slice(-16);
        const cardNum = `${uid16.slice(0,4)}   ${uid16.slice(4,8)}   ${uid16.slice(8,12)}   ${uid16.slice(12,16)}`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "36px \"Courier New\", Courier, monospace";
        ctx.fillText(cardNum, 60, 480);

        // Name
        const name = (await usersData.getName(senderID) || "VALUED MEMBER").toUpperCase();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Helvetica, Arial, sans-serif";
        ctx.fillText(name, 60, 560);

        // Visa
        ctx.font = "bold italic 60px serif";
        ctx.textAlign = "right";
        ctx.fillText("VISA", W - 60, 560);

        const outPath = path.join(__dirname, "cache", `bank_${senderID}.png`);
        await fs.ensureDir(path.dirname(outPath));
        await fs.writeFile(outPath, canvas.toBuffer("image/png"));
        message.reply({ attachment: fs.createReadStream(outPath) });
        break;
      }

      case "transfer":
      case "t": {
        if (!args[1] || !args[2]) return message.reply(getLang("missingTarget"));
        const amount = parseInt(args[2]);
        if (!amount || amount <= 0) return message.reply(getLang("invalidAmount"));
        if (amount > userMoney) return message.reply(getLang("insufficientFunds", userMoney));

        const targetID = Object.keys(event.mentions)[0];
        if (!targetID) return message.reply(getLang("userNotFound"));
        if (targetID === senderID) return message.reply(getLang("cannotTransferSelf"));

        const targetUserData = await usersData.get(targetID);
        if (!targetUserData) return message.reply(getLang("userNotFound"));

        await usersData.set(senderID, { money: userMoney - amount });
        await usersData.set(targetID, { money: targetUserData.money + amount });

        const transferTransaction = { type: "transfer_sent", amount: amount, description: `Transfer to ${event.mentions[targetID]}`, date: moment().format("DD/MM/YYYY HH:mm:ss"), relatedUser: targetID };
        const receiveTransaction = { type: "transfer_received", amount: amount, description: `Received from ${event.senderName}`, date: moment().format("DD/MM/YYYY HH:mm:ss"), relatedUser: senderID };

        economyData.transactions.unshift(transferTransaction);
        if (economyData.transactions.length > 20) economyData.transactions.pop();
        await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

        let targetEconomyData = await usersData.get(targetID, "data.economy");
        if (!targetEconomyData) {
          targetEconomyData = { bankBalance: 0, investments: {}, transactions: [], lastDailyReward: "", bankLevel: 1, investmentLevel: 1 };
        }
        targetEconomyData.transactions.unshift(receiveTransaction);
        if (targetEconomyData.transactions.length > 20) targetEconomyData.transactions.pop();
        await usersData.set(targetID, targetEconomyData.transactions, "data.economy.transactions");

        message.reply(getLang("transferSuccess", amount, event.mentions[targetID]));
        break;
      }

      case "history":
      case "h": {
        if (!economyData.transactions || economyData.transactions.length === 0) return message.reply(getLang("noTransactions"));
        let msg = getLang("transactionHistory") + "\n\n";
        const recentTransactions = economyData.transactions.slice(0, 10);
        for (const transaction of recentTransactions) {
          const typeText = { deposit: "Deposit", withdraw: "Withdraw", transfer_sent: "Transfer Sent", transfer_received: "Transfer Received" }[transaction.type] || transaction.type;
          msg += getLang("transactionItem", transaction.date, transaction.amount, typeText) + "\n";
        }
        message.reply(msg);
        break;
      }

      default: {
        const bankBalance = economyData.bankBalance;
        const walletBalance = userMoney;
        let msg = "🏦 **BANK SYSTEM** 🏦\n\n";
        msg += getLang("bankBalance", bankBalance) + "\n";
        msg += getLang("walletBalance", walletBalance) + "\n\n";
        msg += "📋 **Available Commands:**\n";
        msg += "• `bank deposit <amount>` - Deposit money\n";
        msg += "• `bank withdraw <amount>` - Withdraw money\n";
        msg += "• `bank transfer <@tag> <amount>` - Transfer money\n";
        msg += "• `bank history` - View transactions\n";
        msg += "• `bank balance` - View card";
        message.reply(msg);
        break;
      }
    }
  }
};
