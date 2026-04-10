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

        const W = 960, H = 580;
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

        const cardThemes = [
          { a: "#0f0c29", b: "#302b63", c: "#24243e", accent: "#a78bfa", accentLight: "#c4b5fd" },
          { a: "#1a0533", b: "#3b0764", c: "#0a0015", accent: "#e879f9", accentLight: "#f0abfc" },
          { a: "#0c1445", b: "#1e3a8a", c: "#030712", accent: "#60a5fa", accentLight: "#93c5fd" },
          { a: "#022c22", b: "#064e3b", c: "#010f0a", accent: "#34d399", accentLight: "#6ee7b7" },
          { a: "#450a0a", b: "#7f1d1d", c: "#1c0303", accent: "#f87171", accentLight: "#fca5a5" },
          { a: "#1c1917", b: "#44403c", c: "#0c0a09", accent: "#d6d3d1", accentLight: "#f5f5f4" },
          { a: "#0c0a20", b: "#1e1b4b", c: "#050411", accent: "#818cf8", accentLight: "#a5b4fc" },
          { a: "#0d1b2a", b: "#1b4332", c: "#050d14", accent: "#4ade80", accentLight: "#86efac" },
          { a: "#111318", b: "#1e2330", c: "#090b0f", accent: "#94a3b8", accentLight: "#cbd5e1" },
          { a: "#1a1612", b: "#2e2820", c: "#0d0b08", accent: "#c4a882", accentLight: "#e5d0b4" },
          { a: "#141414", b: "#262626", c: "#080808", accent: "#a0a0a0", accentLight: "#d4d4d4" },
          { a: "#16181c", b: "#2c3140", c: "#08090d", accent: "#8b9ab5", accentLight: "#b8c4d8" },
          { a: "#1b1710", b: "#332e22", c: "#0e0c08", accent: "#b8a878", accentLight: "#d8cc9e" },
        ];

        const theme = cardThemes[Math.floor(Math.random() * cardThemes.length)];

        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0,    theme.a);
        bgGrad.addColorStop(0.45, theme.b);
        bgGrad.addColorStop(1,    theme.c);
        ctx.fillStyle = bgGrad;
        roundRect(0, 0, W, H, 36);
        ctx.fill();

        ctx.save();
        const glow1 = ctx.createRadialGradient(W * 0.78, H * 0.18, 0, W * 0.78, H * 0.18, W * 0.6);
        glow1.addColorStop(0, `${theme.accent}32`);
        glow1.addColorStop(0.55, `${theme.accent}0a`);
        glow1.addColorStop(1, "transparent");
        ctx.fillStyle = glow1;
        roundRect(0, 0, W, H, 36);
        ctx.fill();
        ctx.restore();

        ctx.save();
        const glow2 = ctx.createRadialGradient(W * 0.12, H * 0.88, 0, W * 0.12, H * 0.88, W * 0.45);
        glow2.addColorStop(0, `${theme.accent}22`);
        glow2.addColorStop(1, "transparent");
        ctx.fillStyle = glow2;
        roundRect(0, 0, W, H, 36);
        ctx.fill();
        ctx.restore();

        ctx.save();
        const glow3 = ctx.createRadialGradient(W * 0.48, H * 0.5, 0, W * 0.48, H * 0.5, W * 0.38);
        glow3.addColorStop(0, `${theme.accent}0d`);
        glow3.addColorStop(1, "transparent");
        ctx.fillStyle = glow3;
        roundRect(0, 0, W, H, 36);
        ctx.fill();
        ctx.restore();

        const shineGrad = ctx.createLinearGradient(0, 0, W, H);
        shineGrad.addColorStop(0,   "rgba(255,255,255,0.10)");
        shineGrad.addColorStop(0.4, "rgba(255,255,255,0.02)");
        shineGrad.addColorStop(1,   "rgba(0,0,0,0.05)");
        ctx.fillStyle = shineGrad;
        roundRect(0, 0, W, H, 36);
        ctx.fill();

        // Honeycomb hexagon texture
        ctx.save();
        ctx.beginPath();
        roundRect(0, 0, W, H, 36);
        ctx.clip();

        const hexR    = 22;
        const hexW    = Math.sqrt(3) * hexR;
        const hexRowH = 1.5 * hexR;
        const focalX  = W * 0.62, focalY = H * 0.32;
        const maxD    = Math.sqrt(W * W + H * H) * 0.60;

        const drawHex = (cx, cy) => {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = Math.PI / 6 + (Math.PI / 3) * i;
            const vx = cx + hexR * Math.cos(ang);
            const vy = cy + hexR * Math.sin(ang);
            if (i === 0) ctx.moveTo(vx, vy);
            else         ctx.lineTo(vx, vy);
          }
          ctx.closePath();
        };

        const totalRows = Math.ceil(H / hexRowH) + 3;
        const totalCols = Math.ceil(W / hexW) + 3;

        for (let row = -1; row < totalRows; row++) {
          for (let col = -1; col < totalCols; col++) {
            const cx = col * hexW + (row % 2 === 0 ? 0 : hexW / 2);
            const cy = row * hexRowH;
            const dist = Math.sqrt((cx - focalX) ** 2 + (cy - focalY) ** 2);
            const t = Math.max(0, 1 - dist / maxD);

            drawHex(cx, cy);
            ctx.fillStyle = `rgba(255,255,255,${(0.014 + t * 0.038).toFixed(4)})`;
            ctx.fill();

            drawHex(cx, cy);
            ctx.strokeStyle = `rgba(255,255,255,${(0.07 + t * 0.14).toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = `${theme.accent}60`;
        ctx.lineWidth = 1.5;
        roundRect(0, 0, W, H, 36);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 3;
        roundRect(3, 3, W - 6, H - 6, 34);
        ctx.stroke();
        ctx.restore();

        const holderName = (await usersData.getName(senderID) || "CARD HOLDER").toUpperCase();
        const now = new Date();
        const expMM = String(now.getMonth() + 1).padStart(2, "0");
        const expYY = String(now.getFullYear() + 4).slice(-2);

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "left";
        ctx.fillText("SHIZUKA BANK", 52, 62);
        ctx.restore();

        ctx.fillStyle = theme.accentLight;
        ctx.font = "11px Arial";
        ctx.textAlign = "left";
        ctx.fillText("PREMIUM MEMBER", 52, 82);

        ctx.save();
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold italic 62px serif";
        ctx.textAlign = "right";
        ctx.fillText("VISA", W - 50, 76);
        ctx.restore();

        const chipGrad = ctx.createLinearGradient(52, 130, 52 + 78, 130 + 56);
        chipGrad.addColorStop(0, "#f5e27a");
        chipGrad.addColorStop(0.3, "#d4af37");
        chipGrad.addColorStop(0.65, "#c8970f");
        chipGrad.addColorStop(1, "#f0d060");
        const chipX = 52, chipY = 130;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = chipGrad;
        roundRect(chipX, chipY, 78, 56, 9);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "#9a7010";
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(chipX + 24, chipY);       ctx.lineTo(chipX + 24, chipY + 56);
        ctx.moveTo(chipX + 54, chipY);       ctx.lineTo(chipX + 54, chipY + 56);
        ctx.moveTo(chipX,      chipY + 18);  ctx.lineTo(chipX + 24, chipY + 18);
        ctx.moveTo(chipX + 54, chipY + 18);  ctx.lineTo(chipX + 78, chipY + 18);
        ctx.moveTo(chipX,      chipY + 38);  ctx.lineTo(chipX + 24, chipY + 38);
        ctx.moveTo(chipX + 54, chipY + 38);  ctx.lineTo(chipX + 78, chipY + 38);
        ctx.stroke();
        ctx.restore();

        const chipShine = ctx.createLinearGradient(chipX, chipY, chipX + 78, chipY + 30);
        chipShine.addColorStop(0, "rgba(255,255,255,0.35)");
        chipShine.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = chipShine;
        roundRect(chipX, chipY, 78, 28, 9);
        ctx.fill();

        const nfcX = chipX + 110, nfcY = chipY + 28;
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let i = 1; i <= 4; i++) {
          ctx.globalAlpha = 0.35 + i * 0.16;
          ctx.beginPath();
          ctx.arc(nfcX - 12, nfcY, 7 + i * 7, -Math.PI / 4, Math.PI / 4);
          ctx.stroke();
        }
        ctx.restore();

        const avatarCX = W - 98, avatarCY = 172, avatarCR = 58;
        try {
          const avatarUrl = await usersData.getAvatarUrl(senderID);
          const avatar = await loadImage(avatarUrl);
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarCX, avatarCY, avatarCR, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatar, avatarCX - avatarCR, avatarCY - avatarCR, avatarCR * 2, avatarCR * 2);
          ctx.restore();
        } catch (e) {
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.arc(avatarCX, avatarCY, avatarCR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        const ringGrad = ctx.createLinearGradient(avatarCX - avatarCR, avatarCY - avatarCR, avatarCX + avatarCR, avatarCY + avatarCR);
        ringGrad.addColorStop(0, theme.accentLight);
        ringGrad.addColorStop(0.5, theme.accent);
        ringGrad.addColorStop(1, theme.accentLight);
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarCR + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const fmtBal = (num) => {
          const units = ["", "K", "M", "B", "T", "Q"];
          let unit = 0, n = Number(num);
          while (n >= 1000 && unit < units.length - 1) { n /= 1000; unit++; }
          return `${parseFloat(n.toFixed(2))}${units[unit]}`;
        };

        ctx.fillStyle = `${theme.accentLight}cc`;
        ctx.font = "600 13px Arial";
        ctx.textAlign = "left";
        ctx.fillText("AVAILABLE BALANCE", 52, 268);

        ctx.save();
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 68px Arial";
        ctx.fillText(`$${fmtBal(bankBal)}`, 48, 348);
        ctx.restore();

        const uid16 = String(senderID).replace(/\D/g, "").padStart(16, "0").slice(-16);
        const cardNum = `${uid16.slice(0,4)}  ${uid16.slice(4,8)}  ${uid16.slice(8,12)}  ${uid16.slice(12,16)}`;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `bold 34px "Courier New", monospace`;
        ctx.fillText(cardNum, 48, 420);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = `${theme.accent}35`;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(48, 442);
        ctx.lineTo(W - 48, 442);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = `${theme.accentLight}99`;
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.fillText("CARDHOLDER NAME", 52, 476);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText(holderName.slice(0, 26), 52, 502);

        ctx.fillStyle = `${theme.accentLight}99`;
        ctx.font = "12px Arial";
        ctx.fillText("VALID THRU", 400, 476);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText(`${expMM} / ${expYY}`, 400, 502);

        ctx.fillStyle = `${theme.accentLight}99`;
        ctx.font = "12px Arial";
        ctx.fillText("CVV", 560, 476);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText("•••", 560, 502);

        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = theme.accentLight;
        ctx.beginPath();
        ctx.arc(W - 110, H - 70, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(W - 68, H - 70, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = theme.accentLight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W - 110, H - 70, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(W - 68, H - 70, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

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
