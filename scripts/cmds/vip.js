const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { checkVip, getVipRecord, grantVip, revokeVip, getAllActiveVips } = require("../../database/controller/vipCheck");

const dataFolder = path.join(__dirname, "../../data");
const dbPath = path.join(dataFolder, "vip_config.json");
const M = 1000000;

if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, {
    commands: ["Art", "Edit", "Fakechat", "Gay", "Fluxpro", "Mistake", "Pair mention", "Pair msg Reply"]
});

const packages = {
    "1":  { days: 1,  price: 1.0  * M, label: "1M",    name: "1 DAY VIP"    },
    "2":  { days: 2,  price: 1.8  * M, label: "1.8M",  name: "2 DAYS VIP"   },
    "3":  { days: 3,  price: 2.5  * M, label: "2.5M",  name: "3 DAYS VIP"   },
    "4":  { days: 5,  price: 4.0  * M, label: "4M",    name: "5 DAYS VIP"   },
    "5":  { days: 7,  price: 6.0  * M, label: "6M",    name: "7 DAYS VIP"   },
    "6":  { days: 10, price: 8.5  * M, label: "8.5M",  name: "10 DAYS VIP"  },
    "7":  { days: 15, price: 12.0 * M, label: "12M",   name: "15 DAYS VIP"  },
    "8":  { days: 20, price: 16.0 * M, label: "16M",   name: "20 DAYS VIP"  },
    "9":  { days: 25, price: 20.0 * M, label: "20M",   name: "25 DAYS VIP"  },
    "10": { days: 30, price: 24.0 * M, label: "24M",   name: "30 DAYS VIP"  }
};

function getUnicodeNumber(num) {
    const uninum = ["𝟎","𝟏","𝟐","𝟑","𝟒","𝟓","𝟔","𝟕","𝟖","𝟗"];
    return num.toString().split("").map(n => uninum[parseInt(n)]).join("");
}

function formatExpiry(ms) {
    return new Date(ms).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function daysLeft(expiry) {
    const diff = expiry - Date.now();
    if (diff <= 0) return "Expired";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

module.exports = {
    config: {
        name: "vip",
        version: "2.1",
        author: "MahMUD",
        countDown: 5,
        role: 0,
        shortDescription: "Advanced MongoDB VIP System",
        category: "system",
        guide: "{pn} | buy [#] | info | check [@user] | cmd | list | add [@user] [days] | extend [@user] [days] | remove [@user]"
    },

    onStart: async function ({ api, event, args, message, usersData }) {
        const vipConfig = fs.readJsonSync(dbPath);
        const action = args[0]?.toLowerCase();
        const isAdmin = global.GoatBot.config.adminBot.includes(event.senderID);

        let senderName = "User";
        try {
            const sData = await usersData.get(event.senderID);
            senderName = sData?.name || "User";
        } catch (e) {}

        // --- NO ACTION: SHOW MENU ---
        if (!action) {
            const isVip = await checkVip(event.senderID);
            const record = await getVipRecord(event.senderID);
            let statusLine = isAdmin
                ? "👑 Status: Admin (Lifetime VIP)"
                : isVip
                    ? `✅ Status: VIP | Expires in ${daysLeft(record.expiry)}`
                    : "❌ Status: Not a VIP member";

            const menu =
                `╭─ 🌸 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗡𝗨\n` +
                `├ ${statusLine}\n` +
                `├─ 𝐁𝐮𝐲   — Purchase VIP\n` +
                `├─ 𝐈𝐧𝐟𝐨  — View your VIP card\n` +
                `├─ 𝐂𝐡𝐞𝐜𝐤 — Check another user\n` +
                `├─ 𝐂𝐦𝐝  — VIP command list\n` +
                `╰─ 𝐋𝐢𝐬𝐭  — All VIP members\n` +
                `\n• ${senderName}`;
            return message.reply(menu);
        }

        // --- INFO: Show the sender's VIP card ---
        if (action === "info") {
            const isVip = await checkVip(event.senderID);
            if (!isVip) return message.reply("❌ You are not a VIP member.\nBuy VIP using: /vip buy");

            const record = await getVipRecord(event.senderID);
            const expiryText = isAdmin ? "𝗙𝗢𝗥𝗘𝗩𝗘𝗥" : formatExpiry(record.expiry);

            message.reply("⌛ Generating your Premium VIP Card...");
            const imgPath = await createVipCard(event.senderID, senderName, expiryText);
            return message.reply({
                body: `🌸 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠𝗕𝗘𝗥\n𝗡𝗮𝗺𝗲: ${senderName}\n𝗩𝗮𝗹𝗶𝗱 𝗧𝗵𝗿𝘂: ${expiryText}`,
                attachment: fs.createReadStream(imgPath)
            }, () => { try { fs.unlinkSync(imgPath); } catch (e) {} });
        }

        // --- CHECK: Check another user's VIP status ---
        if (action === "check") {
            let targetID = event.type === "message_reply"
                ? event.messageReply.senderID
                : Object.keys(event.mentions)[0] || args[1];

            if (!targetID) return message.reply("❌ Mention or reply to a user to check their VIP status.");

            const isVip = await checkVip(targetID);
            const record = await getVipRecord(targetID);
            const isTargetAdmin = global.GoatBot.config.adminBot.includes(targetID);

            let targetName = "Unknown";
            try { const d = await usersData.get(targetID); targetName = d?.name || "Unknown"; } catch (e) {}

            if (isTargetAdmin) {
                return message.reply(`👑 ${targetName} is an Admin (Lifetime VIP).`);
            } else if (isVip && record) {
                return message.reply(
                    `✅ ${targetName} is a VIP member.\n` +
                    `📅 Expires: ${formatExpiry(record.expiry)}\n` +
                    `⏳ Time left: ${daysLeft(record.expiry)}`
                );
            } else {
                return message.reply(`❌ ${targetName} is not a VIP member.`);
            }
        }

        // --- BUY: Purchase a VIP package ---
        if (action === "buy") {
            const packKey = args[1];
            const uData = await usersData.get(event.senderID) || {};
            const userMoney = uData.money || 0;

            if (!packKey) {
                const formatMoney = (userMoney / M).toFixed(1) + "M";
                message.reply("⌛ Opening VIP Store...");
                const storeImgPath = await createStoreImage(event.senderID, senderName, formatMoney);
                return message.reply({
                    body: "🛒 Select a plan using: /vip buy <number>",
                    attachment: fs.createReadStream(storeImgPath)
                }, () => { try { fs.unlinkSync(storeImgPath); } catch (e) {} });
            }

            const pack = packages[packKey];
            if (!pack) return message.reply("❌ Invalid package. Use /vip buy to see available plans.");
            if (userMoney < pack.price) {
                return message.reply(`❌ Not enough coins!\nYou need ${pack.label} but have ${(userMoney / M).toFixed(1)}M.`);
            }

            await usersData.set(event.senderID, { money: userMoney - pack.price });
            const { expiry } = await grantVip(event.senderID, pack.days);

            return message.reply(
                `✅ Successfully purchased ${pack.name}!\n` +
                `📅 Expires: ${formatExpiry(expiry)}\n` +
                `⏳ Time left: ${daysLeft(expiry)}`
            );
        }

        // --- CMD: Show VIP-only commands list ---
        if (action === "cmd") {
            const vipConfig = fs.readJsonSync(dbPath);
            let cmdText = `👑 𝗩𝗜𝗣 𝗘𝘅𝗰𝗹𝘂𝘀𝗶𝘃𝗲 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀\n\n`;
            vipConfig.commands.forEach((cmd, index) => {
                cmdText += `${getUnicodeNumber(index + 1)}. ${cmd}\n`;
            });
            return message.reply(cmdText);
        }

        // --- LIST: Show all active VIP members ---
        if (action === "list") {
            const vips = await getAllActiveVips();
            if (vips.length === 0) return message.reply("No active VIP members found.");

            let listText = `👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠𝗕𝗘𝗥𝗦 (${vips.length})\n\n`;
            for (let [index, v] of vips.entries()) {
                let name = "Unknown";
                try { const d = await usersData.get(v.userID); name = d?.name || "Unknown"; } catch (e) {}
                listText += `${index + 1}. ${name}\n   ⏳ ${daysLeft(v.expiry)} left (Exp: ${new Date(v.expiry).toLocaleDateString("en-GB")})\n`;
            }
            return message.reply(listText);
        }

        // --- ADMIN: ADD VIP ---
        if (action === "add") {
            if (!isAdmin) return message.reply("❌ Only admins can use this command.");
            let targetID = event.type === "message_reply"
                ? event.messageReply.senderID
                : Object.keys(event.mentions)[0] || args[1];
            let days = parseInt(args[args.length - 1]);

            if (!targetID || isNaN(days) || days <= 0) {
                return message.reply("❌ Format: /vip add @mention [days]\nExample: /vip add @user 7");
            }

            const { expiry, isNew } = await grantVip(targetID, days);
            let targetName = "User";
            try { const d = await usersData.get(targetID); targetName = d?.name || "User"; } catch (e) {}

            return message.reply(
                `✅ ${isNew ? "Granted" : "Extended"} VIP for ${targetName} by ${days} days.\n` +
                `📅 New expiry: ${formatExpiry(expiry)}`
            );
        }

        // --- ADMIN: EXTEND VIP ---
        if (action === "extend") {
            if (!isAdmin) return message.reply("❌ Only admins can use this command.");
            let targetID = event.type === "message_reply"
                ? event.messageReply.senderID
                : Object.keys(event.mentions)[0] || args[1];
            let days = parseInt(args[args.length - 1]);

            if (!targetID || isNaN(days) || days <= 0) {
                return message.reply("❌ Format: /vip extend @mention [days]");
            }

            const { expiry } = await grantVip(targetID, days);
            let targetName = "User";
            try { const d = await usersData.get(targetID); targetName = d?.name || "User"; } catch (e) {}

            return message.reply(
                `✅ Extended VIP for ${targetName} by ${days} days.\n` +
                `📅 New expiry: ${formatExpiry(expiry)}`
            );
        }

        // --- ADMIN: REMOVE VIP ---
        if (action === "remove") {
            if (!isAdmin) return message.reply("❌ Only admins can use this command.");
            let targetID = event.type === "message_reply"
                ? event.messageReply.senderID
                : Object.keys(event.mentions)[0] || args[1];

            if (!targetID) return message.reply("❌ Mention or reply to a user to remove their VIP.");

            let targetName = "User";
            try { const d = await usersData.get(targetID); targetName = d?.name || "User"; } catch (e) {}

            const removed = await revokeVip(targetID);
            if (removed) {
                return message.reply(`✅ Removed VIP status from ${targetName}.`);
            } else {
                return message.reply(`⚠️ ${targetName} does not have an active VIP.`);
            }
        }

        return message.reply("❓ Unknown action. Use: /vip | buy | info | check | cmd | list | add | extend | remove");
    }
};

// ─── HELPER: Rounded Rectangle ───────────────────────────────────────────────
function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// ─── HELPER: Draw decorative petal/circle clusters ───────────────────────────
function drawPetalCluster(ctx, cx, cy, r, count, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const px = cx + Math.cos(angle) * r * 0.55;
        const py = cy + Math.sin(angle) * r * 0.55;
        ctx.beginPath();
        ctx.ellipse(px, py, r * 0.38, r * 0.22, angle, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
}

// ─── HELPER: Soft grid/dot texture ───────────────────────────────────────────
function drawDotTexture(ctx, width, height) {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    const spacing = 22;
    for (let y = spacing; y < height; y += spacing) {
        for (let x = spacing; x < width; x += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ─── STORE IMAGE — LIGHT PINK THEME ──────────────────────────────────────────
async function createStoreImage(uid, name, balance) {
    const W = 800, H = 1020;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // ── Background: soft pink-to-lavender gradient ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   "#FFF0F5");
    bg.addColorStop(0.45,"#FFD6E7");
    bg.addColorStop(0.8, "#F9C2D8");
    bg.addColorStop(1,   "#F0AACC");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawDotTexture(ctx, W, H);

    // ── Decorative petal clusters ──
    drawPetalCluster(ctx, 760, 35, 55, 6, "rgba(255,160,195,0.30)");
    drawPetalCluster(ctx, 40,  980, 55, 6, "rgba(255,160,195,0.25)");
    drawPetalCluster(ctx, 760, 980, 40, 5, "rgba(230,130,175,0.20)");

    // ── Header banner ──
    const headerGrad = ctx.createLinearGradient(0, 0, W, 0);
    headerGrad.addColorStop(0,   "#E91E63");
    headerGrad.addColorStop(0.5, "#F06292");
    headerGrad.addColorStop(1,   "#E91E63");
    ctx.fillStyle = headerGrad;
    ctx.shadowColor = "rgba(233,30,99,0.4)";
    ctx.shadowBlur = 18;
    roundRect(ctx, 0, 0, W, 115, 0);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, 0, 0, W, 58, 0);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 6;
    ctx.fillText("🌸  SHIZUKA VIP STORE  🌸", W / 2, 72);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";

    // ── User profile card ──
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.strokeStyle = "#F48FB1";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(244,143,177,0.35)";
    ctx.shadowBlur = 14;
    roundRect(ctx, 40, 135, W - 80, 120, 20, true, true);
    ctx.shadowBlur = 0;

    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(115, 195, 46, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 69, 149, 92, 92);
        ctx.restore();
        const ring = ctx.createLinearGradient(69, 149, 161, 241);
        ring.addColorStop(0, "#F48FB1");
        ring.addColorStop(0.5, "#E91E63");
        ring.addColorStop(1, "#F06292");
        ctx.beginPath();
        ctx.arc(115, 195, 46, 0, Math.PI * 2);
        ctx.strokeStyle = ring;
        ctx.lineWidth = 3.5;
        ctx.stroke();
    } catch (e) {}

    ctx.fillStyle = "#880E4F";
    ctx.font = "bold 28px Arial";
    ctx.fillText(name, 180, 183);
    ctx.fillStyle = "#E91E63";
    ctx.font = "22px Arial";
    ctx.fillText(`💰 Balance: ${balance}`, 180, 218);
    ctx.fillStyle = "#AD1457";
    ctx.font = "16px Arial";
    ctx.fillText("Select a package below and type: /vip buy <number>", 180, 246);

    // ── Section header ──
    const secGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
    secGrad.addColorStop(0, "#F8BBD9");
    secGrad.addColorStop(1, "#FCE4EC");
    ctx.fillStyle = secGrad;
    ctx.strokeStyle = "#F48FB1";
    ctx.lineWidth = 1.5;
    roundRect(ctx, 40, 278, W - 80, 42, 10, true, true);

    ctx.fillStyle = "#880E4F";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("✨  VIP PREMIUM PACKAGES  ✨", W / 2, 305);
    ctx.textAlign = "left";

    // ── Package cards ──
    const cardW = 340, cardH = 108;
    const col1X = 40, col2X = 420;
    let rowY = 340;

    for (let i = 1; i <= 10; i++) {
        const pack = packages[i.toString()];
        const cardX = (i % 2 !== 0) ? col1X : col2X;

        // Card shadow + background
        ctx.shadowColor = "rgba(233,30,99,0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        const cGrad = ctx.createLinearGradient(cardX, rowY, cardX, rowY + cardH);
        cGrad.addColorStop(0, "rgba(255,255,255,0.90)");
        cGrad.addColorStop(1, "rgba(252,225,238,0.88)");
        ctx.fillStyle = cGrad;
        ctx.strokeStyle = "#F48FB1";
        ctx.lineWidth = 2;
        roundRect(ctx, cardX, rowY, cardW, cardH, 14, true, true);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        // Number badge
        const badgeGrad = ctx.createLinearGradient(cardX + 14, rowY + 22, cardX + 14, rowY + 80);
        badgeGrad.addColorStop(0, "#F06292");
        badgeGrad.addColorStop(1, "#E91E63");
        ctx.fillStyle = badgeGrad;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        roundRect(ctx, cardX + 14, rowY + 22, 52, 60, 10, true, true);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 3;
        ctx.fillText(`${i}`, cardX + 40, rowY + 60);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";

        // Package name
        ctx.fillStyle = "#880E4F";
        ctx.font = "bold 21px Arial";
        ctx.fillText(pack.name, cardX + 82, rowY + 48);

        // Separator line
        ctx.strokeStyle = "rgba(244,143,177,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 82, rowY + 60);
        ctx.lineTo(cardX + cardW - 16, rowY + 60);
        ctx.stroke();

        // Price and days
        ctx.fillStyle = "#E91E63";
        ctx.font = "bold 17px Arial";
        ctx.fillText(`💎 Cost: ${pack.label}`, cardX + 82, rowY + 82);
        ctx.fillStyle = "#AD1457";
        ctx.font = "16px Arial";
        ctx.fillText(`📅 ${pack.days} day${pack.days > 1 ? "s" : ""}`, cardX + 210, rowY + 82);

        if (i % 2 === 0) rowY += cardH + 14;
    }

    // ── Footer ──
    const footGrad = ctx.createLinearGradient(0, H - 55, W, H);
    footGrad.addColorStop(0, "#E91E63");
    footGrad.addColorStop(1, "#F06292");
    ctx.fillStyle = footGrad;
    roundRect(ctx, 0, H - 52, W, 52, 0);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🌸  Shizuka Bot · Exclusive VIP Benefits  🌸", W / 2, H - 18);
    ctx.textAlign = "left";

    const tempPath = path.join(dataFolder, `vip_store_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}

// ─── VIP CARD — LIGHT PINK THEME ─────────────────────────────────────────────
async function createVipCard(uid, name, expiry) {
    const W = 820, H = 460;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // ── Background gradient ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   "#FFF0F5");
    bg.addColorStop(0.4, "#FFD6E7");
    bg.addColorStop(0.75,"#FFADD2");
    bg.addColorStop(1,   "#F9A8C4");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawDotTexture(ctx, W, H);

    // ── Corner petal decorations ──
    drawPetalCluster(ctx, 0,   0,   80, 5, "rgba(255,180,210,0.38)");
    drawPetalCluster(ctx, W,   0,   80, 5, "rgba(255,180,210,0.38)");
    drawPetalCluster(ctx, 0,   H,   70, 5, "rgba(255,160,195,0.28)");
    drawPetalCluster(ctx, W,   H,   70, 5, "rgba(255,160,195,0.28)");

    // ── Card border: rose-to-deep-pink gradient ──
    const borderGrad = ctx.createLinearGradient(0, 0, W, H);
    borderGrad.addColorStop(0,   "#F48FB1");
    borderGrad.addColorStop(0.3, "#E91E63");
    borderGrad.addColorStop(0.6, "#F06292");
    borderGrad.addColorStop(1,   "#F48FB1");
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 7;
    ctx.shadowColor = "rgba(233,30,99,0.45)";
    ctx.shadowBlur = 18;
    roundRect(ctx, 12, 12, W - 24, H - 24, 22, false, true);
    ctx.shadowBlur = 0;

    // ── Inner faint white overlay for card feel ──
    const innerGrad = ctx.createLinearGradient(0, 0, W, H * 0.5);
    innerGrad.addColorStop(0, "rgba(255,255,255,0.32)");
    innerGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = innerGrad;
    roundRect(ctx, 12, 12, W - 24, H - 24, 22);

    // ── Bank name & tier ──
    ctx.fillStyle = "#880E4F";
    ctx.font = "bold 32px Arial";
    ctx.shadowColor = "rgba(255,255,255,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText("🌸 SHIZUKA BANK", 40, 68);
    ctx.shadowBlur = 0;

    const tierGrad = ctx.createLinearGradient(42, 80, 200, 80);
    tierGrad.addColorStop(0, "#E91E63");
    tierGrad.addColorStop(1, "#AD1457");
    ctx.fillStyle = tierGrad;
    ctx.font = "bold 15px Arial";
    ctx.fillText("PREMIUM  ·  ELITE  ·  VIP", 44, 98);

    // ── Avatar ──
    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);

        ctx.shadowColor = "rgba(233,30,99,0.5)";
        ctx.shadowBlur = 16;
        ctx.save();
        ctx.beginPath();
        ctx.arc(718, 82, 56, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 662, 26, 112, 112);
        ctx.restore();
        ctx.shadowBlur = 0;

        const ring = ctx.createLinearGradient(662, 26, 774, 138);
        ring.addColorStop(0,   "#F48FB1");
        ring.addColorStop(0.4, "#E91E63");
        ring.addColorStop(1,   "#FCE4EC");
        ctx.beginPath();
        ctx.arc(718, 82, 56, 0, Math.PI * 2);
        ctx.strokeStyle = ring;
        ctx.lineWidth = 4;
        ctx.stroke();
    } catch (e) {}

    // ── Chip ──
    const chipGrad = ctx.createLinearGradient(40, 145, 120, 200);
    chipGrad.addColorStop(0, "#F8BBD9");
    chipGrad.addColorStop(0.5, "#E91E63");
    chipGrad.addColorStop(1, "#F48FB1");
    ctx.fillStyle = chipGrad;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(233,30,99,0.3)";
    ctx.shadowBlur = 8;
    roundRect(ctx, 40, 145, 72, 52, 8, true, true);
    ctx.shadowBlur = 0;

    // Chip lines
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    for (let lx = 48; lx <= 104; lx += 10) {
        ctx.beginPath(); ctx.moveTo(lx, 145); ctx.lineTo(lx, 197); ctx.stroke();
    }
    for (let ly = 158; ly <= 185; ly += 13) {
        ctx.beginPath(); ctx.moveTo(40, ly); ctx.lineTo(112, ly); ctx.stroke();
    }

    // ── Member ID label + number ──
    ctx.fillStyle = "#AD1457";
    ctx.font = "bold 14px Arial";
    ctx.fillText("MEMBER ID", 40, 248);

    const idGrad = ctx.createLinearGradient(40, 260, 500, 300);
    idGrad.addColorStop(0, "#880E4F");
    idGrad.addColorStop(0.5, "#E91E63");
    idGrad.addColorStop(1, "#880E4F");
    ctx.fillStyle = idGrad;
    ctx.font = "bold 42px monospace";
    ctx.shadowColor = "rgba(233,30,99,0.3)";
    ctx.shadowBlur = 4;
    const displayId = (uid + "0000000000000000").substring(0, 16).match(/.{1,4}/g).join("  ");
    ctx.fillText(displayId, 40, 296);
    ctx.shadowBlur = 0;

    // ── Cardholder name ──
    ctx.fillStyle = "#880E4F";
    ctx.font = "bold 28px Arial";
    ctx.shadowColor = "rgba(255,255,255,0.7)";
    ctx.shadowBlur = 4;
    ctx.fillText(name.toUpperCase(), 40, 400);
    ctx.shadowBlur = 0;

    // ── Valid thru ──
    ctx.fillStyle = "#AD1457";
    ctx.font = "bold 13px Arial";
    ctx.fillText("VALID THRU", 500, 370);
    ctx.fillStyle = "#880E4F";
    ctx.font = "bold 21px Arial";
    ctx.fillText(expiry, 500, 400);

    // ── ELITE badge ──
    const eliteGrad = ctx.createLinearGradient(655, 380, 810, 420);
    eliteGrad.addColorStop(0, "#E91E63");
    eliteGrad.addColorStop(1, "#F06292");
    ctx.fillStyle = eliteGrad;
    ctx.font = "italic bold 34px Arial";
    ctx.shadowColor = "rgba(233,30,99,0.5)";
    ctx.shadowBlur = 6;
    ctx.fillText("ELITE", 660, 412);
    ctx.shadowBlur = 0;

    // ── Gloss overlay ──
    const gloss = ctx.createLinearGradient(0, 0, W, H * 0.45);
    gloss.addColorStop(0, "rgba(255,255,255,0.22)");
    gloss.addColorStop(0.38, "rgba(255,255,255,0.07)");
    gloss.addColorStop(0.39, "rgba(255,255,255,0)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    roundRect(ctx, 12, 12, W - 24, H - 24, 22);

    const tempPath = path.join(dataFolder, `vip_card_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}
