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
        version: "2.2",
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
        const isAdmin = global.GoatBot.config.adminBot.includes(String(event.senderID));

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

        // --- INFO: Show VIP card ---
        if (action === "info") {
            const isVip = await checkVip(event.senderID);
            if (!isVip) return message.reply("❌ You are not a VIP member.\nBuy VIP using: /vip buy");

            const record = await getVipRecord(event.senderID);
            const expiryText = isAdmin ? "𝗙𝗢𝗥𝗘𝗩𝗘𝗥" : formatExpiry(record?.expiry || Date.now());

            message.reply("⌛ Generating your Premium VIP Card...");
            const imgPath = await createVipCard(event.senderID, senderName, expiryText);
            return message.reply({
                body: `🌸 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠𝗕𝗘𝗥\n𝗡𝗮𝗺𝗲: ${senderName}\n𝗩𝗮𝗹𝗶𝗱 𝗧𝗵𝗿𝘂: ${expiryText}`,
                attachment: fs.createReadStream(imgPath)
            }, () => { try { fs.unlinkSync(imgPath); } catch (e) {} });
        }

        // --- CHECK: Check another user ---
        if (action === "check") {
            let targetID = event.type === "message_reply"
                ? event.messageReply.senderID
                : Object.keys(event.mentions)[0] || args[1];

            if (!targetID) return message.reply("❌ Mention or reply to a user to check their VIP status.");

            const isVip = await checkVip(targetID);
            const record = await getVipRecord(targetID);
            const isTargetAdmin = global.GoatBot.config.adminBot.includes(String(targetID));

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

        // --- BUY: Purchase VIP ---
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

        // --- CMD: VIP command list ---
        if (action === "cmd") {
            const vipConfig = fs.readJsonSync(dbPath);
            let cmdText = `👑 𝗩𝗜𝗣 𝗘𝘅𝗰𝗹𝘂𝘀𝗶𝘃𝗲 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀\n\n`;
            vipConfig.commands.forEach((cmd, index) => {
                cmdText += `${getUnicodeNumber(index + 1)}. ${cmd}\n`;
            });
            return message.reply(cmdText);
        }

        // --- LIST: All active VIP members ---
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

            // days is always the last arg
            let days = parseInt(args[args.length - 1]);

            console.log(`[VIP ADD] admin=${event.senderID} targetID=${targetID} days=${days} args=${JSON.stringify(args)} mentions=${JSON.stringify(event.mentions)}`);

            if (!targetID || isNaN(days) || days <= 0) {
                return message.reply(
                    `❌ Format: /vip add @mention [days]\nExample: /vip add @user 7\n` +
                    `Debug: targetID=${targetID}, days=${days}, args=${JSON.stringify(args)}`
                );
            }

            try {
                const { expiry, isNew } = await grantVip(String(targetID), days);
                let targetName = "User";
                try { const d = await usersData.get(targetID); targetName = d?.name || "User"; } catch (e) {}

                return message.reply(
                    `✅ ${isNew ? "Granted" : "Extended"} VIP for ${targetName} by ${days} days.\n` +
                    `📅 New expiry: ${formatExpiry(expiry)}\n` +
                    `🆔 UserID: ${targetID}`
                );
            } catch (err) {
                console.error("[VIP ADD] Error:", err);
                return message.reply(`❌ Failed to grant VIP: ${err.message}`);
            }
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

            try {
                const { expiry } = await grantVip(String(targetID), days);
                let targetName = "User";
                try { const d = await usersData.get(targetID); targetName = d?.name || "User"; } catch (e) {}

                return message.reply(
                    `✅ Extended VIP for ${targetName} by ${days} days.\n` +
                    `📅 New expiry: ${formatExpiry(expiry)}`
                );
            } catch (err) {
                return message.reply(`❌ Failed to extend VIP: ${err.message}`);
            }
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
function roundRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
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
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// ─── HELPER: Subtle diagonal line pattern ───────────────────────────────────
function drawDiagonalPattern(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += 18) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i + h, y + h);
        ctx.stroke();
    }
    ctx.restore();
}

// ─── HELPER: Draw a circle sparkle cluster ───────────────────────────────────
function drawSparkles(ctx, cx, cy, count, maxR, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const r = maxR * (0.5 + Math.random() * 0.5);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * maxR * 0.8, cy + Math.sin(angle) * maxR * 0.8, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// VIP STORE IMAGE  —  warm neutral cream + rose accent
// ══════════════════════════════════════════════════════════════════════════════
async function createStoreImage(uid, name, balance) {
    const W = 800, H = 1040;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // ── Background: warm cream/neutral ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   "#FBF3F6");
    bg.addColorStop(0.5, "#F5E8EE");
    bg.addColorStop(1,   "#EDD8E4");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Subtle dot grid ──
    ctx.fillStyle = "rgba(180,100,130,0.07)";
    for (let gy = 16; gy < H; gy += 20) {
        for (let gx = 16; gx < W; gx += 20) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Header bar: deep berry ──
    const hdr = ctx.createLinearGradient(0, 0, W, 0);
    hdr.addColorStop(0, "#5C1A35");
    hdr.addColorStop(0.5, "#8B2556");
    hdr.addColorStop(1, "#5C1A35");
    ctx.fillStyle = hdr;
    roundRect(ctx, 0, 0, W, 130, 0);

    // header shimmer strip
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 0, 0, W, 65, 0);

    // Rose-gold divider line
    const divLine = ctx.createLinearGradient(0, 130, W, 130);
    divLine.addColorStop(0, "transparent");
    divLine.addColorStop(0.3, "#D4957F");
    divLine.addColorStop(0.7, "#D4957F");
    divLine.addColorStop(1, "transparent");
    ctx.strokeStyle = divLine;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 130); ctx.lineTo(W, 130); ctx.stroke();

    // header text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.fillText("🌸  SHIZUKA VIP STORE  🌸", W / 2, 78);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "16px Arial";
    ctx.fillText("Premium Exclusive Access · Members Only", W / 2, 112);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";

    // ── User info card ──
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.strokeStyle = "#C9907A";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(100,30,60,0.12)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, 35, 150, W - 70, 118, 18, true, true);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // avatar
    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(108, 209, 44, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, 64, 165, 88, 88);
        ctx.restore();
        const ring = ctx.createLinearGradient(64, 165, 152, 253);
        ring.addColorStop(0, "#D4957F");
        ring.addColorStop(0.5, "#8B2556");
        ring.addColorStop(1, "#D4957F");
        ctx.beginPath();
        ctx.arc(108, 209, 44, 0, Math.PI * 2);
        ctx.strokeStyle = ring;
        ctx.lineWidth = 3;
        ctx.stroke();
    } catch (e) {}

    ctx.fillStyle = "#3A0E22";
    ctx.font = "bold 25px Arial";
    ctx.fillText(name, 172, 196);
    ctx.fillStyle = "#8B2556";
    ctx.font = "bold 19px Arial";
    ctx.fillText(`💰  Balance: ${balance}`, 172, 226);
    ctx.fillStyle = "#7A5060";
    ctx.font = "15px Arial";
    ctx.fillText("Type /vip buy <number> to purchase a package", 172, 252);

    // ── Section label ──
    const secGrad = ctx.createLinearGradient(35, 0, W - 35, 0);
    secGrad.addColorStop(0, "#E8C8D8");
    secGrad.addColorStop(1, "#F5E0EA");
    ctx.fillStyle = secGrad;
    ctx.strokeStyle = "#C9907A";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(100,30,60,0.08)";
    ctx.shadowBlur = 6;
    roundRect(ctx, 35, 290, W - 70, 40, 10, true, true);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#5C1A35";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("✦  CHOOSE YOUR VIP PACKAGE  ✦", W / 2, 316);
    ctx.textAlign = "left";

    // ── Package cards (2-column grid) ──
    const cW = 349, cH = 105;
    const col1 = 35, col2 = 416;
    let rowY = 348;

    for (let i = 1; i <= 10; i++) {
        const pack = packages[String(i)];
        const cardX = (i % 2 !== 0) ? col1 : col2;

        // card shadow
        ctx.shadowColor = "rgba(100,30,60,0.13)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // card background
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = (i % 2 === 1) ? "#D4957F" : "#B87BB0";
        ctx.lineWidth = 2;
        roundRect(ctx, cardX, rowY, cW, cH, 14, true, true);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        // left accent bar
        const barClr = ctx.createLinearGradient(cardX, rowY, cardX, rowY + cH);
        barClr.addColorStop(0, "#8B2556");
        barClr.addColorStop(1, "#5C1A35");
        ctx.fillStyle = barClr;
        roundRect(ctx, cardX, rowY, 8, cH, 14);

        // number circle
        const numGrad = ctx.createLinearGradient(cardX + 20, rowY + 20, cardX + 20, rowY + 80);
        numGrad.addColorStop(0, "#8B2556");
        numGrad.addColorStop(1, "#5C1A35");
        ctx.fillStyle = numGrad;
        ctx.beginPath();
        ctx.arc(cardX + 38, rowY + 52, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#D4957F";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 2;
        ctx.fillText(`${i}`, cardX + 38, rowY + 60);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";

        // package info
        ctx.fillStyle = "#3A0E22";
        ctx.font = "bold 19px Arial";
        ctx.fillText(pack.name, cardX + 74, rowY + 38);

        ctx.strokeStyle = "rgba(200,150,170,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 74, rowY + 48);
        ctx.lineTo(cardX + cW - 12, rowY + 48);
        ctx.stroke();

        ctx.fillStyle = "#8B2556";
        ctx.font = "bold 16px Arial";
        ctx.fillText(`💎 ${pack.label}`, cardX + 74, rowY + 71);

        ctx.fillStyle = "#7A5060";
        ctx.font = "15px Arial";
        ctx.fillText(`📅 ${pack.days}d`, cardX + 190, rowY + 71);

        // Days badge
        ctx.fillStyle = "#F3E0E8";
        roundRect(ctx, cardX + cW - 68, rowY + 14, 58, 24, 6);
        ctx.fillStyle = "#8B2556";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${pack.days} DAY${pack.days > 1 ? "S" : ""}`, cardX + cW - 39, rowY + 30);
        ctx.textAlign = "left";

        if (i % 2 === 0) rowY += cH + 12;
    }

    // ── Footer ──
    const foot = ctx.createLinearGradient(0, H - 58, W, H);
    foot.addColorStop(0, "#5C1A35");
    foot.addColorStop(1, "#8B2556");
    ctx.fillStyle = foot;
    roundRect(ctx, 0, H - 56, W, 56, 0);

    ctx.fillStyle = "rgba(212,149,127,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, H - 56); ctx.lineTo(W, H - 56); ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "17px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🌸  Shizuka Bot  ·  VIP System  ·  Exclusive Access  🌸", W / 2, H - 20);
    ctx.textAlign = "left";

    const tempPath = path.join(dataFolder, `vip_store_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}

// ══════════════════════════════════════════════════════════════════════════════
// VIP CARD  —  deep rose/berry luxury credit card style
// ══════════════════════════════════════════════════════════════════════════════
async function createVipCard(uid, name, expiry) {
    const W = 860, H = 480;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // ── Card background: deep rich rose/berry ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   "#1E0812");
    bg.addColorStop(0.35,"#3D1225");
    bg.addColorStop(0.65,"#621A3D");
    bg.addColorStop(1,   "#3A1028");
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 26);

    // ── Subtle diagonal texture overlay ──
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, 0, 0, W, H, 26, false);
    ctx.clip();
    drawDiagonalPattern(ctx, 0, 0, W, H, "rgba(255,255,255,0.025)");
    ctx.restore();

    // ── Glowing orbs for depth ──
    const orb1 = ctx.createRadialGradient(W * 0.85, H * 0.18, 10, W * 0.85, H * 0.18, 200);
    orb1.addColorStop(0, "rgba(212,149,127,0.22)");
    orb1.addColorStop(1, "transparent");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, W, H);

    const orb2 = ctx.createRadialGradient(W * 0.1, H * 0.85, 10, W * 0.1, H * 0.85, 180);
    orb2.addColorStop(0, "rgba(139,37,86,0.35)");
    orb2.addColorStop(1, "transparent");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, W, H);

    // ── Card border: rose-gold metallic ──
    const border = ctx.createLinearGradient(0, 0, W, H);
    border.addColorStop(0,   "#E8C4A8");
    border.addColorStop(0.25,"#D4957F");
    border.addColorStop(0.5, "#C9807A");
    border.addColorStop(0.75,"#D4957F");
    border.addColorStop(1,   "#E8C4A8");
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.shadowColor = "rgba(212,149,127,0.6)";
    ctx.shadowBlur = 20;
    roundRect(ctx, 5, 5, W - 10, H - 10, 23, false, true);
    ctx.shadowBlur = 0;

    // ── Top-left: Bank name ──
    ctx.fillStyle = "#E8C4A8";
    ctx.font = "bold 28px Arial";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.fillText("SHIZUKA  BANK", 42, 58);
    ctx.shadowBlur = 0;

    const subGrad = ctx.createLinearGradient(42, 70, 260, 70);
    subGrad.addColorStop(0, "#D4957F");
    subGrad.addColorStop(1, "#C9807A");
    ctx.fillStyle = subGrad;
    ctx.font = "13px Arial";
    ctx.fillText("P R E M I U M   E L I T E   M E M B E R", 44, 84);

    // thin rose-gold separator
    const sepGrad = ctx.createLinearGradient(42, 94, 420, 94);
    sepGrad.addColorStop(0, "#D4957F");
    sepGrad.addColorStop(0.6, "rgba(212,149,127,0.3)");
    sepGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(42, 94); ctx.lineTo(420, 94); ctx.stroke();

    // ── Top-right: Avatar ──
    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        const cx = W - 80, cy = 80, rad = 58;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, cx - rad, cy - rad, rad * 2, rad * 2);
        ctx.restore();

        const ring = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
        ring.addColorStop(0, "#E8C4A8");
        ring.addColorStop(0.4, "#D4957F");
        ring.addColorStop(0.8, "#8B2556");
        ring.addColorStop(1, "#E8C4A8");
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.strokeStyle = ring;
        ctx.lineWidth = 4;
        ctx.shadowColor = "rgba(212,149,127,0.8)";
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
    } catch (e) {}

    // ── Chip ──
    const chipBg = ctx.createLinearGradient(42, 120, 130, 185);
    chipBg.addColorStop(0, "#E8C4A8");
    chipBg.addColorStop(0.4, "#D4957F");
    chipBg.addColorStop(1, "#B87060");
    ctx.fillStyle = chipBg;
    ctx.shadowColor = "rgba(212,149,127,0.5)";
    ctx.shadowBlur = 10;
    roundRect(ctx, 42, 120, 76, 56, 9);
    ctx.shadowBlur = 0;

    // chip lines
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.2;
    for (let lx = 50; lx <= 110; lx += 12) {
        ctx.beginPath(); ctx.moveTo(lx, 120); ctx.lineTo(lx, 176); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(42, 140); ctx.lineTo(118, 140); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, 155); ctx.lineTo(118, 155); ctx.stroke();

    // ── Contactless icon ──
    ctx.strokeStyle = "rgba(212,149,127,0.7)";
    ctx.lineWidth = 2.5;
    for (let r = 12; r <= 28; r += 8) {
        ctx.beginPath();
        ctx.arc(155, 148, r, -Math.PI * 0.65, Math.PI * 0.65);
        ctx.stroke();
    }

    // ── Member ID ──
    ctx.fillStyle = "rgba(212,149,127,0.7)";
    ctx.font = "bold 12px Arial";
    ctx.letterSpacing = "2px";
    ctx.fillText("MEMBER  ID", 42, 218);

    const idGrad = ctx.createLinearGradient(42, 230, 600, 280);
    idGrad.addColorStop(0, "#FFFFFF");
    idGrad.addColorStop(0.4, "#E8C4A8");
    idGrad.addColorStop(0.8, "#FFFFFF");
    idGrad.addColorStop(1, "#D4957F");
    ctx.fillStyle = idGrad;
    ctx.font = "bold 46px monospace";
    ctx.shadowColor = "rgba(212,149,127,0.4)";
    ctx.shadowBlur = 10;
    const displayId = (uid + "0000000000000000").substring(0, 16).match(/.{1,4}/g).join("   ");
    ctx.fillText(displayId, 42, 272);
    ctx.shadowBlur = 0;

    // ── Bottom section divider ──
    const botDiv = ctx.createLinearGradient(42, 300, W - 42, 300);
    botDiv.addColorStop(0, "#D4957F");
    botDiv.addColorStop(0.5, "rgba(212,149,127,0.25)");
    botDiv.addColorStop(1, "transparent");
    ctx.strokeStyle = botDiv;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(42, 300); ctx.lineTo(W - 42, 300); ctx.stroke();

    // ── Cardholder name ──
    ctx.fillStyle = "rgba(212,149,127,0.65)";
    ctx.font = "bold 12px Arial";
    ctx.fillText("CARDHOLDER", 42, 330);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 30px Arial";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.fillText(name.toUpperCase(), 42, 368);
    ctx.shadowBlur = 0;

    // ── VIP badge strip ──
    const stripGrad = ctx.createLinearGradient(42, 395, 280, 430);
    stripGrad.addColorStop(0, "rgba(212,149,127,0.18)");
    stripGrad.addColorStop(1, "transparent");
    ctx.fillStyle = stripGrad;
    roundRect(ctx, 42, 395, 230, 34, 8);
    ctx.fillStyle = "#D4957F";
    ctx.font = "bold 14px Arial";
    ctx.fillText("✦  VIP  ELITE  MEMBER  ✦", 56, 417);

    // ── Valid thru ──
    ctx.fillStyle = "rgba(212,149,127,0.65)";
    ctx.font = "bold 12px Arial";
    ctx.fillText("VALID  THRU", 500, 330);
    ctx.fillStyle = "#E8C4A8";
    ctx.font = "bold 20px Arial";
    ctx.fillText(expiry, 500, 362);

    // ── ELITE wordmark ──
    const eliteGrad = ctx.createLinearGradient(680, 400, 840, 440);
    eliteGrad.addColorStop(0, "#E8C4A8");
    eliteGrad.addColorStop(0.5, "#D4957F");
    eliteGrad.addColorStop(1, "#E8C4A8");
    ctx.fillStyle = eliteGrad;
    ctx.font = "italic bold 38px Arial";
    ctx.shadowColor = "rgba(212,149,127,0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText("ELITE", 685, 430);
    ctx.shadowBlur = 0;

    // ── Gloss overlay ──
    const gloss = ctx.createLinearGradient(0, 0, W, H * 0.42);
    gloss.addColorStop(0, "rgba(255,255,255,0.12)");
    gloss.addColorStop(0.35, "rgba(255,255,255,0.04)");
    gloss.addColorStop(0.36, "rgba(255,255,255,0)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, 5, 5, W - 10, H - 10, 23, false);
    ctx.clip();
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const tempPath = path.join(dataFolder, `vip_card_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}
