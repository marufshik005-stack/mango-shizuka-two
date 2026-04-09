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
        version: "2.0",
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
function roundRect(ctx, x, y, width, height, radius) {
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
    ctx.fill();
    if (ctx.lineWidth > 0) ctx.stroke();
}

// ─── HELPER: Honeycomb Texture ────────────────────────────────────────────────
function drawHoneycombBackground(ctx, width, height) {
    const r = 18;
    const w = Math.sqrt(3) * r;
    const h = 2 * r;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    for (let y = 0, row = 0; y < height + h; y += h * 0.75, row++) {
        for (let x = 0; x < width + w; x += w) {
            const offset = (row % 2 === 1) ? w / 2 : 0;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - (Math.PI / 6);
                const hx = (x + offset) + r * Math.cos(angle);
                const hy = y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

// ─── STORE IMAGE ──────────────────────────────────────────────────────────────
async function createStoreImage(uid, name, balance) {
    const canvas = createCanvas(800, 1000);
    const ctx = canvas.getContext("2d");

    const bgGradient = ctx.createLinearGradient(0, 0, 0, 1000);
    bgGradient.addColorStop(0, "#0b0c10");
    bgGradient.addColorStop(1, "#1f2833");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 800, 1000);
    drawHoneycombBackground(ctx, 800, 1000);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 45px Arial";
    ctx.fillText(`Hello, ${name} ✨`, 50, 80);

    ctx.fillStyle = "rgba(25,25,30,0.7)";
    ctx.strokeStyle = "rgba(213,160,58,0.3)";
    ctx.lineWidth = 2;
    roundRect(ctx, 50, 130, 700, 140, 20);

    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 200, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 70, 150, 100, 100);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(120, 200, 50, 0, Math.PI * 2);
        ctx.strokeStyle = "#FBEA9D";
        ctx.lineWidth = 3;
        ctx.stroke();
    } catch (e) {}

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.fillText(name, 200, 190);
    ctx.fillStyle = "#c5a059";
    ctx.font = "24px Arial";
    ctx.fillText(`Available Balance: ${balance}`, 200, 230);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.fillText("VIP PREMIUM PACKAGES", 50, 330);

    let startX = 50;
    let startY = 370;

    for (let i = 1; i <= 10; i++) {
        const pack = packages[i.toString()];
        const cardGrad = ctx.createLinearGradient(startX, startY, startX, startY + 100);
        cardGrad.addColorStop(0, "rgba(35,35,45,0.95)");
        cardGrad.addColorStop(1, "rgba(20,20,26,0.95)");

        ctx.fillStyle = cardGrad;
        ctx.strokeStyle = "rgba(213,160,58,0.25)";
        ctx.lineWidth = 1;
        roundRect(ctx, startX, startY, 330, 100, 12);

        ctx.fillStyle = "rgba(213,160,58,0.15)";
        roundRect(ctx, startX + 15, startY + 25, 50, 50, 10);
        ctx.fillStyle = "#FBEA9D";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${i}`, startX + 40, startY + 58);
        ctx.textAlign = "left";

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText(pack.name, startX + 85, startY + 45);
        ctx.fillStyle = "#c5a059";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`Cost: ${pack.label}`, startX + 85, startY + 75);

        if (i % 2 !== 0) { startX = 420; }
        else { startX = 50; startY += 120; }
    }

    const tempPath = path.join(dataFolder, `vip_store_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}

// ─── VIP CARD ─────────────────────────────────────────────────────────────────
async function createVipCard(uid, name, expiry) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#111115";
    ctx.fillRect(0, 0, 800, 450);
    drawHoneycombBackground(ctx, 800, 450);

    const goldGradient = ctx.createLinearGradient(0, 0, 800, 450);
    goldGradient.addColorStop(0, "#FBEA9D");
    goldGradient.addColorStop(0.3, "#D5A03A");
    goldGradient.addColorStop(0.5, "#F7D070");
    goldGradient.addColorStop(0.7, "#B37B22");
    goldGradient.addColorStop(1, "#FBEA9D");

    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.strokeStyle = goldGradient;
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 770, 420);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial";
    ctx.fillText("SHIZUKA BANK", 40, 70);
    ctx.fillStyle = "#888888";
    ctx.font = "16px Arial";
    ctx.fillText("PREMIUM ELITE", 42, 95);

    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 15;
        ctx.save();
        ctx.beginPath();
        ctx.arc(700, 80, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 650, 30, 100, 100);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(700, 80, 50, 0, Math.PI * 2);
        ctx.strokeStyle = goldGradient;
        ctx.lineWidth = 4;
        ctx.stroke();
    } catch (e) {}

    ctx.shadowBlur = 3; ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.fillStyle = goldGradient;
    ctx.beginPath();
    const [cx, cy, cw, ch, cr] = [40, 140, 70, 50, 8];
    ctx.moveTo(cx + cr, cy);
    ctx.lineTo(cx + cw - cr, cy); ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + cr);
    ctx.lineTo(cx + cw, cy + ch - cr); ctx.quadraticCurveTo(cx + cw, cy + ch, cx + cw - cr, cy + ch);
    ctx.lineTo(cx + cr, cy + ch); ctx.quadraticCurveTo(cx, cy + ch, cx, cy + ch - cr);
    ctx.lineTo(cx, cy + cr); ctx.quadraticCurveTo(cx, cy, cx + cr, cy);
    ctx.fill();

    ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 5;
    ctx.fillStyle = "#E8E8E8";
    ctx.font = "20px Arial";
    ctx.fillText("MEMBER ID", 40, 240);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 44px monospace";
    const displayId = (uid + "000000000000").substring(0, 16).match(/.{1,4}/g).join("  ");
    ctx.fillText(displayId, 40, 290);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 26px Arial";
    ctx.fillText(name.toUpperCase(), 40, 390);

    ctx.fillStyle = "#888888";
    ctx.font = "bold 16px Arial";
    ctx.fillText("VALID THRU", 500, 365);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Arial";
    ctx.fillText(expiry, 500, 395);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "italic bold 35px Arial";
    ctx.fillText("ELITE", 670, 395);

    ctx.shadowBlur = 0;
    const gloss = ctx.createLinearGradient(0, 0, 800, 450);
    gloss.addColorStop(0, "rgba(255,255,255,0.15)");
    gloss.addColorStop(0.4, "rgba(255,255,255,0.05)");
    gloss.addColorStop(0.41, "rgba(255,255,255,0)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(15, 15, 770, 420);

    const tempPath = path.join(dataFolder, `vip_card_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}
