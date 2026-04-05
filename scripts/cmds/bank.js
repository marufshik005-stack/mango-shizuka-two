const moment = require("moment-timezone");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

async function renderTxnReceipt({
  type, // "Deposit" | "Withdrawal"
  amount,
  bankBalance,
  userName,
  userID
}) {
  const W = 1200, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background image
  try {
    const bg = await loadImage("https://i.postimg.cc/ryHfwpLJ/ezgif-22bfaf4827830f.jpg");
    ctx.drawImage(bg, 0, 0, W, H);
  }
  catch (e) {
    ctx.fillStyle = "#ffd6e7";
    ctx.fillRect(0, 0, W, H);
  }
  // Soft overlay
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

  // Border
  ctx.strokeStyle = "#e9e3e6";
  ctx.lineWidth = 2;
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
  ctx.stroke();

  // Watermark
  try {
    const mark = await loadImage("https://i.postimg.cc/288zFmcg/shizuka-photo-5233.jpg");
    ctx.save();
    ctx.globalAlpha = 0.08;
    const mw = cardW * 0.55;
    const mh = mw * (mark.height / mark.width);
    const mx = cardX + (cardW - mw) / 2;
    const my = cardY + (cardH - mh) / 2;
    ctx.drawImage(mark, mx, my, mw, mh);
    ctx.restore();
  } catch (e) {}

  // Header ribbon
  ctx.fillStyle = "#ff3f93";
  ctx.fillRect(cardX, cardY + 18, cardW, 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Shizuka Bank", cardX + 32, cardY + 56);
  ctx.textAlign = "right";
  ctx.font = "18px Arial";
  ctx.fillText(moment().format("YYYY-MM-DD HH:mm:ss"), cardX + cardW - 20, cardY + 54);

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
  ctx.fillText("Account ID", sx, sy + lh);
  ctx.fillText("Amount", sx, sy + lh * 2);
  ctx.fillText("Bank Balance", sx, sy + lh * 3);

  ctx.textAlign = "right";
  ctx.fillStyle = "#444";
  ctx.font = "24px Arial";
  ctx.fillText(userName, cardX + cardW - 60, sy);
  ctx.fillText(String(userID), cardX + cardW - 60, sy + lh);
  ctx.fillStyle = type === "Deposit" ? "#1a9b34" : "#c03535";
  ctx.font = "bold 30px Arial";
  ctx.fillText(`$${fmt(amount)}`, cardX + cardW - 60, sy + lh * 2);
  ctx.fillStyle = "#444";
  ctx.font = "24px Arial";
  ctx.fillText(`$${fmt(bankBalance)}`, cardX + cardW - 60, sy + lh * 3);

  // QR
  try {
    const id = "SB-" + Date.now().toString(36).toUpperCase().slice(-8);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(type+"|UID:"+userID+"|ID:"+id)}`;
    const qr = await loadImage(qrUrl);
    ctx.drawImage(qr, cardX + 60, cardY + cardH - 180, 120, 120);
  } catch (e) {}

  // Stamp
  ctx.beginPath();
  ctx.arc(cardX + cardW - 140, cardY + cardH - 120, 34, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,63,147,0.15)";
  ctx.fill();
  ctx.strokeStyle = "#ff3f93";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ff3f93";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SHIZUKA", cardX + cardW - 140, cardY + cardH - 116);

  return canvas.toBuffer("image/png");
}

module.exports = {
  config: {
    name: "bank",
    aliases: ["b"],
    version: "1.2", 
    author: "𝐙ɪs𝐀𝐍",
    countDown: 5,
    role: 0,
    description: {
      vi: "Quản lý tài khoản ngân hàng - gửi tiền, rút tiền, chuyển khoản",
      en: "Manage bank account - deposit, withdraw, transfer money"
    },
    category: "economy",
    guide: {
      vi: "    {pn} deposit <số tiền>: Gửi tiền vào ngân hàng"
        + "\n    {pn} withdraw <số tiền>: Rút tiền từ ngân hàng"
        + "\n    {pn} balance: Xem số dư ngân hàng"
        + "\n    {pn} transfer <@tag> <số tiền>: Chuyển tiền cho người khác"
        + "\n    {pn} history: Xem lịch sử giao dịch",
      en: "    {pn} deposit <amount>: Deposit money to bank"
        + "\n    {pn} withdraw <amount>: Withdraw money from bank"
        + "\n    {pn} balance: View bank balance"
        + "\n    {pn} transfer <@tag> <amount>: Transfer money to someone"
        + "\n    {pn} history: View transaction history"
    }
  },

  langs: {
    vi: {
      depositSuccess: "✅ Đã gửi %1$ vào ngân hàng thành công!",
      withdrawSuccess: "✅ Đã rút %1$ từ ngân hàng thành công!",
      transferSuccess: "✅ Đã chuyển %1$ cho %2 thành công!",
      transferReceived: "💰 Bạn đã nhận được %1$ từ %2!",
      insufficientFunds: "❌ Không đủ tiền! Bạn chỉ có %1$",
      insufficientBankFunds: "❌ Không đủ tiền trong ngân hàng! Bạn chỉ có %1$ trong ngân hàng",
      invalidAmount: "❌ Số tiền không hợp lệ!",
      bankBalance: "🏦 Số dư ngân hàng: %1$",
      walletBalance: "💳 Số dư ví: %1$",
      noTransactions: "📋 Chưa có giao dịch nào",
      transactionHistory: "📋 Lịch sử giao dịch gần đây:",
      transactionItem: "• %1 - %2$ (%3)",
      missingAmount: "❌ Vui lòng nhập số tiền!",
      missingTarget: "❌ Vui lòng tag người muốn chuyển tiền!",
      cannotTransferSelf: "❌ Không thể chuyển tiền cho chính mình!",
      userNotFound: "❌ Không tìm thấy người dùng!",
      bankInterest: "💰 Lãi suất ngân hàng: %1$ (hàng ngày lúc 00:00)",
      bankLevel: "🏦 Cấp độ ngân hàng: %1",
      nextLevel: "📈 Cấp tiếp theo: %1$ cần thiết"
    },
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
      userNotFound: "❌ User not found!",
      bankInterest: "💰 Bank interest: %1$ (daily at 00:00)",
      bankLevel: "🏦 Bank Level: %1",
      nextLevel: "📈 Next level: %1$ required"
    }
  },

  onStart: async function ({ message, args, event, usersData, getLang, api }) {
    const { senderID } = event;
    const action = args[0]?.toLowerCase();

    // Helper function to parse amounts like 1k, 1m, 1b
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
        const amount = parseAmount(args[1]);
        if (isNaN(amount) || amount <= 0) {
          return message.reply(getLang("invalidAmount"));
        }
        if (amount > userMoney) {
          return message.reply(getLang("insufficientFunds", userMoney));
        }

        await usersData.set(senderID, { money: userMoney - amount });
        await usersData.set(senderID, economyData.bankBalance + amount, "data.economy.bankBalance");

        const depositTransaction = {
          type: "deposit",
          amount: amount,
          description: "Bank Deposit",
          date: moment().format("DD/MM/YYYY HH:mm:ss"),
          relatedUser: null
        };
        economyData.transactions.unshift(depositTransaction);
        if (economyData.transactions.length > 20) economyData.transactions.pop();
        await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

        try {
          const holderName = await usersData.getName(senderID) || senderID;
          const buf = await renderTxnReceipt({
            type: "Deposit",
            amount,
            bankBalance: economyData.bankBalance + amount,
            userName: holderName,
            userID: senderID
          });
          const outPath = path.join(__dirname, "cache", `bank_txn_${senderID}_deposit.png`);
          await fs.ensureDir(path.dirname(outPath));
          await fs.writeFile(outPath, buf);
          await message.reply({ attachment: fs.createReadStream(outPath), body: getLang("depositSuccess", amount) });
          try { await fs.remove(outPath); } catch (e) {}
        }
        catch (e) {
          message.reply(getLang("depositSuccess", amount));
        }
        break;
      }

      case "withdraw":
      case "w": {
        const amount = parseAmount(args[1]);
        if (isNaN(amount) || amount <= 0) {
          return message.reply(getLang("invalidAmount"));
        }
        if (amount > economyData.bankBalance) {
          return message.reply(getLang("insufficientBankFunds", economyData.bankBalance));
        }

        await usersData.set(senderID, { money: userMoney + amount });
        await usersData.set(senderID, economyData.bankBalance - amount, "data.economy.bankBalance");

        const withdrawTransaction = {
          type: "withdraw",
          amount: amount,
          description: "Bank Withdrawal",
          date: moment().format("DD/MM/YYYY HH:mm:ss"),
          relatedUser: null
        };
        economyData.transactions.unshift(withdrawTransaction);
        if (economyData.transactions.length > 20) economyData.transactions.pop();
        await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

        try {
          const holderName = await usersData.getName(senderID) || senderID;
          const buf = await renderTxnReceipt({
            type: "Withdrawal",
            amount,
            bankBalance: economyData.bankBalance - amount,
            userName: holderName,
            userID: senderID
          });
          const outPath = path.join(__dirname, "cache", `bank_txn_${senderID}_withdraw.png`);
          await fs.ensureDir(path.dirname(outPath));
          await fs.writeFile(outPath, buf);
          await message.reply({ attachment: fs.createReadStream(outPath), body: getLang("withdrawSuccess", amount) });
          try { await fs.remove(outPath); } catch (e) {}
        }
        catch (e) {
          message.reply(getLang("withdrawSuccess", amount));
        }
        break;
      }

      case "balance":
      case "b": {
        const bankBal = economyData.bankBalance;

        // Visa card logic remains the same
        const W = 900, H = 567;
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

        const gradients = [
          ["#141414", "#292929", "#0a0a0a"], 
          ["#30030c", "#5c0b1b", "#1a0105"], 
          ["#0a1d33", "#13355c", "#05111f"], 
          ["#041c10", "#0b3d22", "#020f09"], 
          ["#4d0012", "#a6113b", "#29000a"], 
          ["#050505", "#1c1c1c", "#000000"],
          ["#424245", "#6c6c70", "#2b2b2d"],
          ["#8a8a8a", "#b5b5b5", "#636363"],
          ["#635d55", "#968e83", "#403b35"],
          ["#24262b", "#474b54", "#15161a"],
          ["#21201d", "#403d37", "#12110f"] 
        ];
        
        const randomGrad = gradients[Math.floor(Math.random() * gradients.length)];
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0,   randomGrad[0]);
        grad.addColorStop(0.5, randomGrad[1]);
        grad.addColorStop(1,   randomGrad[2]);
        ctx.fillStyle = grad;
        roundRect(0, 0, W, H, 30);
        ctx.fill();

        const metallicGlow = ctx.createLinearGradient(0, 0, W, H);
        metallicGlow.addColorStop(0, "rgba(255,255,255,0.18)");
        metallicGlow.addColorStop(0.3, "rgba(255,255,255,0.0)");
        metallicGlow.addColorStop(0.6, "rgba(255,255,255,0.0)");
        metallicGlow.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = metallicGlow;
        roundRect(0, 0, W, H, 30);
        ctx.fill();

        ctx.save();
        for (let i = 0; i < 8; i++) {
          ctx.strokeStyle = `rgba(255,255,255,${(0.02 + i * 0.005).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(W + 100, H / 2, 250 + i * 50, Math.PI * 0.6, Math.PI * 1.4);
          ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px Arial";
        ctx.textAlign = "left";
        ctx.fillText("SHI BANK LTD.", 50, 60);

        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold italic 56px serif";
        ctx.textAlign = "right";
        ctx.fillText("VISA", W - 50, 70);
        ctx.shadowColor = "transparent"; 
        ctx.textAlign = "left";

        const chipX = 50, chipY = 140;
        ctx.fillStyle = "#d4af37"; 
        roundRect(chipX, chipY, 70, 50, 8);
        ctx.fill();
        ctx.strokeStyle = "#aa8222"; 
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(chipX + 22, chipY); ctx.lineTo(chipX + 22, chipY + 50);
        ctx.moveTo(chipX + 48, chipY); ctx.lineTo(chipX + 48, chipY + 50);
        ctx.moveTo(chipX, chipY + 16); ctx.lineTo(chipX + 22, chipY + 16);
        ctx.moveTo(chipX + 48, chipY + 16); ctx.lineTo(chipX + 70, chipY + 16);
        ctx.moveTo(chipX, chipY + 34); ctx.lineTo(chipX + 22, chipY + 34);
        ctx.moveTo(chipX + 48, chipY + 34); ctx.lineTo(chipX + 70, chipY + 34);
        ctx.stroke();

        const cxIcon = chipX + 110, cyIcon = chipY + 25;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        for (let i = 1; i <= 4; i++) {
          ctx.beginPath();
          ctx.arc(cxIcon - 15, cyIcon, 8 + i * 6, -Math.PI/4.5, Math.PI/4.5);
          ctx.stroke();
        }

        const avatarCX = W - 110, avatarCY = 180, avatarCR = 55;
        try {
          const avatarUrl = await usersData.getAvatarUrl(senderID);
          const avatar = await loadImage(avatarUrl);
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 5;
          ctx.beginPath();
          ctx.arc(avatarCX, avatarCY, avatarCR, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill(); 
          ctx.clip();
          ctx.drawImage(avatar, avatarCX - avatarCR, avatarCY - avatarCR, avatarCR * 2, avatarCR * 2);
          ctx.restore();
        } catch (e) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.beginPath();
          ctx.arc(avatarCX, avatarCY, avatarCR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; 
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarCR + 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "600 16px Arial";
        ctx.fillText("AVAILABLE BALANCE", 50, 260);

        const fmtBal = (num) => {
          const units = ["", "K", "M", "B", "T", "Q"];
          let unit = 0, n = Number(num);
          while (n >= 1000 && unit < units.length - 1) { n /= 1000; unit++; }
          return `${parseFloat(n.toFixed(2))}${units[unit]}`;
        };
        
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 64px Arial";
        ctx.fillText(`$${fmtBal(bankBal)}`, 46, 335);

        const uid16 = String(senderID).replace(/\D/g, "").padStart(16, "0").slice(-16);
        const cardNum = `${uid16.slice(0,4)}  ${uid16.slice(4,8)}  ${uid16.slice(8,12)}  ${uid16.slice(12,16)}`;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = "bold 36px \"Courier New\", monospace";
        ctx.fillText(cardNum, 50, 420);
        ctx.shadowColor = "transparent"; 

        const holderName = (await usersData.getName(senderID) || "CARD HOLDER").toUpperCase();
        const now = new Date();
        const expMM = String(now.getMonth() + 1).padStart(2, "0");
        const expYY = String(now.getFullYear() + 4).slice(-2);

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "14px Arial";
        ctx.fillText("CARDHOLDER", 50, 480);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Arial";
        ctx.fillText(holderName, 50, 510);

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "14px Arial";
        ctx.fillText("VALID THRU", 380, 480);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Arial";
        ctx.fillText(`${expMM}/${expYY}`, 380, 510);

        const outPath = path.join(__dirname, "cache", `bank_visa_${senderID}.png`);
        await fs.ensureDir(path.dirname(outPath));
        await fs.writeFile(outPath, canvas.toBuffer("image/png"));
        await message.reply({ attachment: fs.createReadStream(outPath) });
        try { await fs.remove(outPath); } catch (e) {}

        break;
      }

      case "transfer":
      case "t": {
        if (!args[1] || !args[2]) {
          return message.reply(getLang("missingTarget"));
        }

        const amount = parseAmount(args[2]);
        if (isNaN(amount) || amount <= 0) {
          return message.reply(getLang("invalidAmount"));
        }

        if (amount > userMoney) {
          return message.reply(getLang("insufficientFunds", userMoney));
        }

        const targetID = Object.keys(event.mentions)[0];
        if (!targetID) {
          return message.reply(getLang("userNotFound"));
        }

        if (targetID === senderID) {
          return message.reply(getLang("cannotTransferSelf"));
        }

        const targetUserData = await usersData.get(targetID);
        if (!targetUserData) {
          return message.reply(getLang("userNotFound"));
        }

        await usersData.set(senderID, {
          money: userMoney - amount
        });

        await usersData.set(targetID, {
          money: targetUserData.money + amount
        });

        const transferTransaction = {
          type: "transfer_sent",
          amount: amount,
          description: `Transfer to ${event.mentions[targetID]}`,
          date: moment().format("DD/MM/YYYY HH:mm:ss"),
          relatedUser: targetID
        };

        const receiveTransaction = {
          type: "transfer_received",
          amount: amount,
          description: `Received from ${event.senderName}`,
          date: moment().format("DD/MM/YYYY HH:mm:ss"),
          relatedUser: senderID
        };

        economyData.transactions.unshift(transferTransaction);
        if (economyData.transactions.length > 20) economyData.transactions.pop();
        await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

        let targetEconomyData = await usersData.get(targetID, "data.economy");
        if (!targetEconomyData) {
          targetEconomyData = {
            bankBalance: 0,
            investments: {},
            transactions: [],
            lastDailyReward: "",
            bankLevel: 1,
            investmentLevel: 1
          };
        }
        targetEconomyData.transactions.unshift(receiveTransaction);
        if (targetEconomyData.transactions.length > 20) targetEconomyData.transactions.pop();
        await usersData.set(targetID, targetEconomyData.transactions, "data.economy.transactions");

        message.reply(getLang("transferSuccess", amount, event.mentions[targetID]));
        break;
      }

      case "history":
      case "h": {
        if (!economyData.transactions || economyData.transactions.length === 0) {
          return message.reply(getLang("noTransactions"));
        }

        let msg = getLang("transactionHistory") + "\n\n";
        const recentTransactions = economyData.transactions.slice(0, 10);

        for (const transaction of recentTransactions) {
          const typeText = {
            deposit: "Deposit",
            withdraw: "Withdraw",
            transfer_sent: "Transfer Sent",
            transfer_received: "Transfer Received",
            investment: "Investment",
            dividend: "Dividend",
            daily_reward: "Daily Reward",
            bank_interest: "Bank Interest"
          }[transaction.type] || transaction.type;

          msg += getLang("transactionItem",
            transaction.date,
            transaction.amount,
            typeText
          ) + "\n";
        }

        message.reply(msg);
        break;
      }

      default: {
        const bankBalance = economyData.bankBalance;
        const walletBalance = userMoney;
        const bankLevel = economyData.bankLevel;

        let msg = "🏦 **BANK SYSTEM** 🏦\n\n";
        msg += getLang("bankBalance", bankBalance) + "\n";
        msg += getLang("walletBalance", walletBalance) + "\n";
        msg += getLang("bankLevel", bankLevel) + "\n\n";
        msg += "📋 **Available Commands:**\n";
        msg += "• `bank deposit <amount>` - Deposit money\n";
        msg += "• `bank withdraw <amount>` - Withdraw money\n";
        msg += "• `bank transfer <@tag> <amount>` - Transfer money\n";
        msg += "• `bank history` - View transactions\n";
        msg += "• `bank balance` - View balances";

        message.reply(msg);
        break;
      }
    }
  }
};
