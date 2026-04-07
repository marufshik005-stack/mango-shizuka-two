const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const mongoose = require("mongoose");

// --- MongoDB Model Import ---
// তোমার প্রজেক্টের পাথ অনুযায়ী নিচের লাইনটি ঠিক করে নিও
const Vip = require("../../models/Vip"); 

const dataFolder = path.join(__dirname, "../../data");
const dbPath = path.join(dataFolder, "vip_config.json");
const M = 1000000;

// Config file for static data like command lists
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, { 
    commands: ["Art", "Edit", "Fakechat", "Gay", "Mistake", "Pair mention", "Pair msg Reply"] 
});

const packages = {
    "1": { days: 1, price: 1.0 * M, label: "1M", name: "1 DAY VIP" },
    "2": { days: 2, price: 1.8 * M, label: "1.8M", name: "2 DAYS VIP" },
    "3": { days: 3, price: 2.5 * M, label: "2.5M", name: "3 DAYS VIP" },
    "4": { days: 5, price: 4.0 * M, label: "4.0M", name: "5 DAYS VIP" },
    "5": { days: 7, price: 6.0 * M, label: "6.0M", name: "7 DAYS VIP" },
    "6": { days: 10, price: 8.5 * M, label: "8.5M", name: "10 DAYS VIP" },
    "7": { days: 15, price: 12.0 * M, label: "12.0M", name: "15 DAYS VIP" },
    "8": { days: 20, price: 16.0 * M, label: "16.0M", name: "20 DAYS VIP" },
    "9": { days: 25, price: 20.0 * M, label: "25.0M", name: "25 DAYS VIP" },
    "10": { days: 30, price: 24.0 * M, label: "24.0M", name: "30 DAYS VIP" }
};

function getUnicodeNumber(num) {
    const uninum = ["𝟎","𝟏","𝟐","𝟑","𝟒","𝟓","𝟔","𝟕","𝟖","𝟗"];
    return num.toString().split('').map(n => uninum[n]).join('');
}

module.exports = {
    config: {
        name: "vip",
        version: "1.5",
        author: "MahMUD",
        countDown: 5,
        role: 0,
        shortDescription: "Advanced MongoDB VIP System",
        category: "system",
        guide: "{pn} | buy | info | cmd | list | add | remove"
    },

    onStart: async function ({ api, event, args, message, usersData }) {
        const config = fs.readJsonSync(dbPath);
        const action = args[0]?.toLowerCase();
        const isAdmin = global.GoatBot.config.adminBot.includes(event.senderID);
        
        let senderName = "User";
        try {
            const sData = await usersData.get(event.senderID);
            senderName = sData.name;
        } catch(e) {}

        if (!action) {
            const menu = `╭─ [ 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗡𝗨 ]\n╰‣ 𝐀𝐝𝐝\n╰‣ 𝐑𝐞𝐦𝐨𝐯𝐞\n╰‣ 𝐋𝐢𝐬𝐭\n╰‣ 𝐢𝐧𝐟𝐨\n╰‣ 𝐁𝐮𝐲\n╰‣ 𝐂𝐦𝐝\n\n• ${senderName}`;
            return message.reply(menu);
        }

        // --- 1. INFO ---
        if (action === "info") {
            const userVip = await Vip.findOne({ userID: event.senderID });
            const isUserVip = isAdmin || (userVip && userVip.expiry > Date.now());
            
            if (!isUserVip) return message.reply("❌ You are not a VIP member.\nBuy VIP using: /vip buy");

            message.reply("⌛ 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗩𝗜𝗣 𝗖𝗮𝗿𝗱...");
            let expiryText = isAdmin ? "𝗙𝗢𝗥𝗘𝗩𝗘𝗥" : new Date(userVip.expiry).toLocaleString("en-GB");

            const imgPath = await createVipCard(event.senderID, senderName, expiryText);
            return message.reply({
                body: ` 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠Ｂ𝗘𝗥 \n𝗡𝗮𝗺𝗲: ${senderName}\n𝗩𝗮𝗹𝗶𝗱 𝗧𝗵𝗿𝘂: ${expiryText}`,
                attachment: fs.createReadStream(imgPath)
            }, () => fs.unlinkSync(imgPath));
        }

        // --- 2. BUY ---
        if (action === "buy") {
            const packKey = args[1];
            const uData = await usersData.get(event.senderID) || {};
            const userMoney = uData.money || 0; 
            
            if (!packKey) {
                const formatMoney = (userMoney / M).toFixed(1) + "M";
                const storeImgPath = await createStoreImage(event.senderID, senderName, formatMoney);
                return message.reply({
                    body: "🛒 **𝗢𝗽𝗲𝗻𝗶𝗻𝗴 𝗩𝗜𝗣 𝗦𝘁𝗼𝗿𝗲...**\nSelect a plan using '/vip buy <number>'",
                    attachment: fs.createReadStream(storeImgPath)
                }, () => fs.unlinkSync(storeImgPath));
            }

            const pack = packages[packKey];
            if (!pack) return message.reply("❌ Invalid package.");
            if (userMoney < pack.price) return message.reply(`❌ You need ${pack.label} coins!`);

            await usersData.set(event.senderID, { money: userMoney - pack.price });

            const userVip = await Vip.findOne({ userID: event.senderID });
            let start = Date.now();
            let currentExpiry = (userVip && userVip.expiry > Date.now()) ? userVip.expiry : Date.now();
            
            const newExpiry = currentExpiry + (pack.days * 24 * 60 * 60 * 1000);
            
            await Vip.findOneAndUpdate(
                { userID: event.senderID },
                { expiry: newExpiry, start: userVip?.start || start },
                { upsert: true }
            );

            return message.reply(`✅ Successfully purchased ${pack.name}!`);
        }


          // --- 3. SHOW LOCKED VIP COMMANDS LIST ---
        if (action === "cmd") {
            let cmdText = `𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐕𝐈𝐏 𝐜𝐨𝐦𝐦𝐚𝐧𝐝\n\n`;
            vipDb.commands.forEach((cmd, index) => {
                cmdText += `${getUnicodeNumber(index + 1)}. ${cmd}\n`;
            });
            return message.reply(cmdText);
        }
        // --- 3. LIST ---
        if (action === "list") {
            const vips = await Vip.find({ expiry: { $gt: Date.now() } });
            if (vips.length === 0) return message.reply("No VIP members found.");
            
            let listText = `👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠Ｂ𝗘𝗥𝗦\n\n`;
            for (let [index, v] of vips.entries()) {
                const name = (await usersData.get(v.userID))?.name || "Unknown";
                listText += `${index + 1}. ${name}\n   Exp: ${new Date(v.expiry).toLocaleDateString("en-GB")}\n`;
            }
            return message.reply(listText);
        }

        // --- 4. ADMIN ADD ---
        if (action === "add" && isAdmin) {
            let mentionID = event.type === "message_reply" ? event.messageReply.senderID : Object.keys(event.mentions)[0] || args[1];
            let days = parseInt(args[args.length - 1]);

            if (!mentionID || isNaN(days)) return message.reply("❌ Format: /vip add @mention [days]");

            const newExpiry = Date.now() + (days * 24 * 60 * 60 * 1000);
            await Vip.findOneAndUpdate({ userID: mentionID }, { expiry: newExpiry, start: Date.now() }, { upsert: true });
            return message.reply(`✅ Added VIP to user for ${days} days.`);
        }

        // --- 5. ADMIN REMOVE ---
        if (action === "remove" && isAdmin) {
            let mentionID = event.type === "message_reply" ? event.messageReply.senderID : Object.keys(event.mentions)[0] || args[1];
            await Vip.findOneAndDelete({ userID: mentionID });
            return message.reply("✅ Removed user's VIP status.");
        }
    }
};

// ... (এখানে তোমার আগের createStoreImage, createVipCard এবং roundRect ফাংশনগুলো আগের মতোই থাকবে) ...

// --- HELPER: ROUNDED RECTANGLE ---
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

// --- HELPER: HONEYCOMB TEXTURE ---
function drawHoneycombBackground(ctx, width, height) {
    const r = 18; 
    const w = Math.sqrt(3) * r;
    const h = 2 * r;
    
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.025)"; 

    for (let y = 0, row = 0; y < height + h; y += h * 0.75, row++) {
        for (let x = 0; x < width + w; x += w) {
            const offset = (row % 2 === 1) ? w / 2 : 0;
            const px = x + offset;
            const py = y;
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - (Math.PI / 6);
                const hx = px + r * Math.cos(angle);
                const hy = py + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

// --- REDESIGNED DARK PREMIUM STORE MENU (IMPROVED COLORS & NO EMOJIS) ---
async function createStoreImage(uid, name, balance) {
    // Shorter height since we removed header text
    const canvas = createCanvas(800, 1000); 
    const ctx = canvas.getContext("2d");

    // 1. Sleek Gradient Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 1000);
    bgGradient.addColorStop(0, "#0b0c10"); // Very dark charcoal
    bgGradient.addColorStop(1, "#1f2833"); // Deep metallic slate
    ctx.fillStyle = bgGradient; 
    ctx.fillRect(0, 0, 800, 1000);
    
    // 2. Draw Honeycomb Texture
    drawHoneycombBackground(ctx, 800, 1000);

    // 3. Header Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 45px Arial";
    ctx.fillText(`Hello, ${name} ✨`, 50, 80);

    // 4. Redesigned Profile Card
    ctx.fillStyle = "rgba(25, 25, 30, 0.7)"; 
    ctx.strokeStyle = "rgba(213, 160, 58, 0.3)"; // Muted premium gold
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
    } catch(e) {}

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.fillText(name, 200, 190);
    ctx.fillStyle = "#c5a059"; // Elegant gold
    ctx.font = "24px Arial";
    ctx.fillText(`Available Balance: ${balance}`, 200, 230);

    // 5. Main Section Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.fillText(" VIP PREMIUM PACKAGES", 50, 330);

    // 6. Packages Grid: Centered text, no emojis
    let startX = 50;
    let startY = 370;

    for (let i = 1; i <= 10; i++) {
        const pack = packages[i.toString()];
        
        // Individual Card Gradient
        const cardGrad = ctx.createLinearGradient(startX, startY, startX, startY + 100);
        cardGrad.addColorStop(0, "rgba(35, 35, 45, 0.95)");
        cardGrad.addColorStop(1, "rgba(20, 20, 26, 0.95)");

        ctx.fillStyle = cardGrad;
        ctx.strokeStyle = "rgba(213, 160, 58, 0.25)"; // Subtle Gold border
        ctx.lineWidth = 1;
        roundRect(ctx, startX, startY, 330, 100, 12);
        
        // Number Badge
        ctx.fillStyle = "rgba(213, 160, 58, 0.15)";
        roundRect(ctx, startX + 15, startY + 25, 50, 50, 10);
        ctx.fillStyle = "#FBEA9D"; 
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${i}`, startX + 40, startY + 58);
        
        ctx.textAlign = "left"; // reset alignment
        
        // Name
        ctx.fillStyle = "#ffffff"; 
        ctx.font = "bold 22px Arial";
        ctx.fillText(pack.name, startX + 85, startY + 45);
        
        // Cost
        ctx.fillStyle = "#c5a059"; 
        ctx.font = "bold 18px Arial";
        ctx.fillText(`Cost: ${pack.label}`, startX + 85, startY + 75);

        // Grid Math
        if (i % 2 !== 0) {
            startX = 420; 
        } else {
            startX = 50;  
            startY += 120; 
        }
    }

    const tempPath = path.join(dataFolder, `vip_store_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}

// --- REDESIGNED METALLIC VIP CARD (ATM STYLE) ---
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

    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    ctx.strokeStyle = goldGradient;
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 770, 420);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial"; 
    ctx.fillText("SHIZUKA BANK", 40, 70);
    
    ctx.fillStyle = "#888888";
    ctx.font = "16px Arial";
    ctx.fillText("PREMIUM ELITE", 42, 95);

    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
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
    } catch(e) { }

    ctx.shadowBlur = 3;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.fillStyle = goldGradient;
    ctx.beginPath();
    ctx.moveTo(40 + 8, 140);
    ctx.lineTo(40 + 70 - 8, 140);
    ctx.quadraticCurveTo(40 + 70, 140, 40 + 70, 140 + 8);
    ctx.lineTo(40 + 70, 140 + 50 - 8);
    ctx.quadraticCurveTo(40 + 70, 140 + 50, 40 + 70 - 8, 140 + 50);
    ctx.lineTo(40 + 8, 140 + 50);
    ctx.quadraticCurveTo(40, 140 + 50, 40, 140 + 50 - 8);
    ctx.lineTo(40, 140 + 8);
    ctx.quadraticCurveTo(40, 140, 40 + 8, 140);
    ctx.fill();

    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 5;

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
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    gloss.addColorStop(0.4, "rgba(255, 255, 255, 0.05)");
    gloss.addColorStop(0.41, "rgba(255, 255, 255, 0)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.moveTo(15, 15);
    ctx.lineTo(785, 15);
    ctx.lineTo(785, 435);
    ctx.lineTo(15, 435);
    ctx.closePath();
    ctx.fill();

    const tempPath = path.join(dataFolder, `vip_card_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}
