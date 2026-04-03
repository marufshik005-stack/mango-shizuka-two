const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Full-width bold converter
function toFullWidthBold(str) {
  const map = {
    A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',
    H:'𝐇',I:'𝐈',J:'𝐉',K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',
    O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',U:'𝐔',
    V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙',
    a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',
    h:'𝐡',i:'𝐢',j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',
    o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',u:'𝐮',
    v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',
    0:'𝟎',1:'𝟏',2:'𝟐',3:'𝟑',4:'𝟒',5:'𝟓',
    6:'𝟔',7:'𝟕',8:'𝟖',9:'𝟗'
  };
  return str.split('').map(c => map[c] || c).join('');
}

function formatMoney(n) {
  const units = ["","K","M","B","T"];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  return n.toFixed(1).replace(/\.0$/, '') + units[i];
}

function drawCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
}

function drawFlower(ctx, cx, cy, petalR) {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const px = cx + Math.cos(angle) * (petalR * 1.5);
    const py = cy + Math.sin(angle) * (petalR * 1.5);
    ctx.beginPath();
    ctx.arc(px, py, petalR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, petalR * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

async function createSpyCard(opts) {
  const {
    avatarUrl, name, uid, username, gender,
    type, birthday, nickname, location,
    money, rank, moneyRank
  } = opts;

  // Try to load canvas module
  let createCanvas, loadImage;
  try {
    const canvasModule = require("canvas");
    createCanvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
  } catch (e) {
    // Canvas not available, return null to use text fallback
    return null;
  }

  const W = 490, H = 840;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Shizuka pink gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#FFE5F1");
  bgGrad.addColorStop(0.5, "#FFD6E8");
  bgGrad.addColorStop(1, "#FFC0DB");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Add Shizuka image as watermark
  try {
    const shizukaPath = path.join(__dirname, "assets/shizuka.jpeg");
    if (fs.existsSync(shizukaPath)) {
      const shizukaImg = await loadImage(shizukaPath);
      ctx.save();
      ctx.globalAlpha = 0.15;
      const imgSize = 200;
      ctx.drawImage(shizukaImg, W - imgSize - 20, H - imgSize - 80, imgSize, imgSize);
      ctx.restore();
    }
  } catch (e) {
    // If image not found, continue without it
  }

  // Decorative flowers in corners
  ctx.fillStyle = "rgba(255, 182, 193, 0.3)";
  drawFlower(ctx, 40, 40, 15);
  drawFlower(ctx, W - 40, 40, 15);
  drawFlower(ctx, 40, H - 40, 15);
  drawFlower(ctx, W - 40, H - 40, 15);

  // Top decorative border
  ctx.save();
  const topGrad = ctx.createLinearGradient(0, 15, W, 15);
  topGrad.addColorStop(0, "#FF69B4");
  topGrad.addColorStop(0.5, "#FFB6C1");
  topGrad.addColorStop(1, "#FF69B4");
  ctx.fillStyle = topGrad;
  ctx.shadowColor = "#FF69B4";
  ctx.shadowBlur = 15;
  ctx.fillRect(20, 15, W - 40, 6);
  ctx.restore();

  // Bottom decorative border
  ctx.save();
  const bottomGrad = ctx.createLinearGradient(0, H - 21, W, H - 21);
  bottomGrad.addColorStop(0, "#FF1493");
  bottomGrad.addColorStop(0.5, "#FFB6C1");
  bottomGrad.addColorStop(1, "#FF1493");
  ctx.fillStyle = bottomGrad;
  ctx.shadowColor = "#FF1493";
  ctx.shadowBlur = 15;
  ctx.fillRect(20, H - 21, W - 40, 6);
  ctx.restore();

  // Side hearts decoration
  ctx.font = "20px Arial";
  for (let i = 0; i < 8; i++) {
    const y = 80 + (i * 90);
    ctx.fillStyle = `rgba(255, 105, 180, ${0.2 + (i % 2) * 0.2})`;
    ctx.fillText("💖", 5, y);
    ctx.fillText("💖", W - 35, y);
  }

  // Avatar with pink glow
  let av;
  try { av = await loadImage(avatarUrl); }
  catch { av = await loadImage("https://i.imgur.com/I3VsBEt.png"); }
  const r = 85, cx = W / 2, cy = 140;
  
  ctx.save();
  ctx.shadowColor = "#FF69B4";
  ctx.shadowBlur = 30;
  drawCircle(ctx, cx, cy, r + 10);
  const circleGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 10);
  circleGrad.addColorStop(0, "#FFB6C1");
  circleGrad.addColorStop(1, "#FF69B4");
  ctx.fillStyle = circleGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawCircle(ctx, cx, cy, r);
  ctx.clip();
  ctx.drawImage(av, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // White border around avatar
  ctx.save();
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 4;
  drawCircle(ctx, cx, cy, r);
  ctx.stroke();
  ctx.restore();

  // Name with Shizuka style
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FF1493";
  ctx.shadowColor = "#FFB6C1";
  ctx.shadowBlur = 15;
  ctx.fillText(`💝 ${toFullWidthBold(name)} 💝`, W / 2, cy + r + 60);

  // Info lines
  const startY = cy + r + 100;
  const pillH = 36, pillW = W - 60;
  const items = [
    ["🆔 UID", uid],
    ["🌐 Username", username.startsWith("@") ? username : `@${username}`],
    ["🚻 Gender", gender],
    ["🎓 Type", type || "User"],
    ["🎂 Birthday", birthday || "Private"],
    ["💬 Nickname", nickname || name],
    ["🌍 Location", location || "Private"],
    ["💰 Money", `$${formatMoney(money)}`],
    ["📈 XP Rank", `#${rank}`],
    ["🏦 Money Rank", `#${moneyRank}`]
  ];

  ctx.font = "17px Arial";
  ctx.textAlign = "left";
  let y = startY;
  for (let i = 0; i < items.length; i++) {
    const [label, val] = items[i];
    const x = 30;

    // Pink gradient pill
    const pillGrad = ctx.createLinearGradient(x, y, x + pillW, y);
    if (i % 2 === 0) {
      pillGrad.addColorStop(0, "rgba(255, 182, 193, 0.9)");
      pillGrad.addColorStop(1, "rgba(255, 192, 203, 0.9)");
    } else {
      pillGrad.addColorStop(0, "rgba(255, 192, 203, 0.9)");
      pillGrad.addColorStop(1, "rgba(255, 182, 193, 0.9)");
    }
    ctx.fillStyle = pillGrad;
    ctx.shadowColor = "rgba(255, 105, 180, 0.3)";
    ctx.shadowBlur = 8;
    ctx.fillRect(x, y, pillW, pillH);

    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#8B0052";
    ctx.fillText(`${label}: `, x + 10, y + pillH / 2 + 6);
    const w = ctx.measureText(`${label}: `).width;

    const color = i % 2 === 0 ? "#FF1493" : "#FF69B4";
    ctx.fillStyle = color;
    ctx.fillText(toFullWidthBold(val.toString()), x + 10 + w, y + pillH / 2 + 6);
    y += pillH + 12;
  }

  // Shizuka signature text at bottom
  ctx.font = "italic 16px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FF69B4";
  ctx.shadowColor = "#FFB6C1";
  ctx.shadowBlur = 10;
  ctx.fillText("~ Shizuka's Info Card ~", W / 2, H - 35);

  return canvas.toBuffer("image/png");
}

module.exports = {
  config: {
    name: "spy",
    version: "5.0",
    role: 0,
    author: "zisan",
    category: "information",
    description: "Shizuka spy card",
    countDown: 5
  },

  onStart: async ({ api, event, message, usersData }) => {
    try {
      const uid =
        Object.keys(event.mentions || {})[0] ||
        event.messageReply?.senderID ||
        event.senderID;

      const wait = await message.reply("💖 Shizuka is preparing your cute card...");

      const [uInfo, uDB, avatarUrl, allUsers] = await Promise.all([
        api.getUserInfo(uid),
        usersData.get(uid),
        usersData.getAvatarUrl(uid),
        usersData.getAll()
      ]);

      const info = uInfo[uid];
      const genderMap = {
        1: "𝙶𝚒𝚛𝚕 🙋🏻‍♀️",
        2: "𝙱𝚘𝚢 🙋🏻‍♂️",
        0: "𝙶𝚊𝚢 🤷🏻‍♂️"
      };

      const nickname =
        typeof info.alternateName === "string" && info.alternateName.trim().length > 0
          ? info.alternateName.trim()
          : info.name;

      const location = info.location?.name || "Private";

      const rank =
        allUsers.sort((a, b) => b.exp - a.exp).findIndex(u => u.userID === uid) + 1;
      const moneyRank =
        allUsers.sort((a, b) => b.money - a.money).findIndex(u => u.userID === uid) + 1;

      const username = info.vanity || `facebook.com/${uid}`;

      const buffer = await createSpyCard({
        avatarUrl,
        name: info.name,
        uid,
        username,
        gender: genderMap[info.gender] || "Unknown",
        type: info.type || "User",
        birthday: info.isBirthday !== false ? info.isBirthday : "Private",
        nickname,
        location,
        money: uDB.money,
        rank,
        moneyRank
      });

      await message.unsend(wait.messageID);

      // If canvas not available, use text-based Shizuka card
      if (!buffer) {
        const textCard = `
╔═══════════════════════════════════╗
║   💝 ~ SHIZUKA'S INFO CARD ~ 💝   ║
╠═══════════════════════════════════╣
║                                   ║
║  👤 ${toFullWidthBold(info.name)}
║                                   ║
║  🆔 UID: ${uid}
║  🌐 Username: ${username.startsWith("@") ? username : `@${username}`}
║  🚻 Gender: ${genderMap[info.gender] || "Unknown"}
║  🎓 Type: ${info.type || "User"}
║  🎂 Birthday: ${info.isBirthday || "Private"}
║  💬 Nickname: ${nickname}
║  🌍 Location: ${location}
║  💰 Money: $${uDB.money.toLocaleString()}
║  📈 XP Rank: #${rank}
║  🏦 Money Rank: #${moneyRank}
║                                   ║
╚═══════════════════════════════════╝
        💖 Created with love by Shizuka 💖`;
        
        return message.reply(textCard);
      }

      const dir = path.join(__dirname, "cache");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const file = path.join(dir, `spy_card_${uid}.png`);
      fs.writeFileSync(file, buffer);

      return message.reply({ attachment: fs.createReadStream(file) });
    } catch (err) {
      console.error(err);
      return message.reply("❌ Oops! Shizuka couldn't create the card. Please try again!");
    }
  }
};


