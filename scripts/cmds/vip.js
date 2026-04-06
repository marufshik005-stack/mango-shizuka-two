const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// Database & Constant setup
const dataFolder = path.join(__dirname, "../../data");
const dbPath = path.join(dataFolder, "vip.json");
const M = 1000000; // 1 Million

if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, { users: {}, commands: ["Art", "Edit", "Fakechat", "Gay", "Mistake", "Pair mention", "Pair msg Reply"] });

// Auto-migrate old database if needed
let tempDb = fs.readJsonSync(dbPath);
if (!tempDb.users) {
    const migrated = { users: {}, commands: ["Art", "Edit", "Fakechat", "Gay", "Mistake", "Pair mention", "Pair msg Reply"] };
    for (let key in tempDb) migrated.users[key] = tempDb[key];
    fs.writeJsonSync(dbPath, migrated);
}

// VIP Packages Pricing
const packages = {
    "1": { days: 1, price: 1.0 * M, label: "1M", name: "1 DAY VIP" },
    "2": { days: 2, price: 1.8 * M, label: "1.8M", name: "2 DAYS VIP" },
    "3": { days: 3, price: 2.5 * M, label: "2.5M", name: "3 DAYS VIP" },
    "4": { days: 5, price: 4.0 * M, label: "4.0M", name: "5 DAYS VIP" },
    "5": { days: 7, price: 6.0 * M, label: "6.0M", name: "7 DAYS VIP" },
    "6": { days: 10, price: 8.5 * M, label: "8.5M", name: "10 DAYS VIP" },
    "7": { days: 15, price: 12.0 * M, label: "12.0M", name: "15 DAYS VIP" },
    "8": { days: 20, price: 16.0 * M, label: "16.0M", name: "20 DAYS VIP" },
    "9": { days: 25, price: 20.0 * M, label: "20.0M", name: "25 DAYS VIP" },
    "10": { days: 30, price: 24.0 * M, label: "24.0M", name: "30 DAYS VIP" }
};

function getUnicodeNumber(num) {
    const uninum = ["𝟎","𝟏","𝟐","𝟑","𝟒","𝟓","𝟔","𝟕","𝟖","𝟗"];
    return num.toString().split('').map(n => uninum[n]).join('');
}

module.exports = {
    config: {
        name: "vip",
        version: "1.1",
        author: "zisan",
        countDown: 5,
        role: 0,
        shortDescription: "Advanced VIP System",
        longDescription: "Buy VIP, check status, see locked commands and graphical store.",
        category: "system",
        guide: "{pn} | buy | info | cmd | list | add | remove"
    },

    onStart: async function ({ api, event, args, message, usersData }) {
        const vipDb = fs.readJsonSync(dbPath);
        const action = args[0]?.toLowerCase();
        const isAdmin = global.GoatBot.config.adminBot.includes(event.senderID);
        
        let senderName = "User";
        try {
            const sData = await usersData.get(event.senderID);
            senderName = sData.name;
        } catch(e) {}

        // --- 0. MAIN MENU ---
        if (!action) {
            const menu = `╭─ [ 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗡𝗨 ]\n╰‣ 𝐀𝐝𝐝\n╰‣ 𝐑𝐞𝐦𝐨𝐯𝐞\n╰‣ 𝐋𝐢𝐬𝐭\n╰‣ 𝐢𝐧𝐟𝐨\n╰‣ 𝐁𝐮𝐲\n╰‣ 𝐂𝐦𝐝\n\n• ${senderName}`;
            return message.reply(menu);
        }

        // --- 1. SHOW VIP INFO & CARD ---
        if (action === "info") {
            const isUserVip = isAdmin || (vipDb.users[event.senderID] && vipDb.users[event.senderID].expiry > Date.now());
            if (!isUserVip) return message.reply("❌ You are not a VIP member.\nBuy VIP using: /vip buy");

            message.reply("⌛ 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗩𝗜𝗣 𝗖𝗮𝗿𝗱...");
            let expiryText = "𝗙𝗢𝗥𝗘𝗩𝗘𝗥";
            if (!isAdmin && vipDb.users[event.senderID]) {
                const date = new Date(vipDb.users[event.senderID].expiry);
                expiryText = date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString("en-GB");
            }

            try {
                const imgPath = await createVipCard(event.senderID, senderName, expiryText);
                return message.reply({
                    body: `👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠𝗕𝗘𝗥 👑\n𝗡𝗮𝗺𝗲: ${senderName}\n𝗩𝗮𝗹𝗶𝗱 𝗧𝗵𝗿𝘂: ${expiryText}`,
                    attachment: fs.createReadStream(imgPath)
                }, () => {
                    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                });
            } catch (err) {
                return message.reply("❌ Error generating VIP card.");
            }
        }

        // --- 2. BUY VIP (WITH STORE IMAGE) ---
        if (action === "buy") {
            const packKey = args[1];
            
            let uData = {};
            try {
                uData = await usersData.get(event.senderID);
            } catch (e) {
                return message.reply("❌ Error fetching user data.");
            }
            const userMoney = uData.money || 0; 
            
            if (!packKey) {
                const formatMoney = (userMoney / M).toFixed(1) + "M";
                message.reply("🛒 𝗢𝗽𝗲𝗻𝗶𝗻𝗴 𝗩𝗜𝗣 𝗦𝘁𝗼𝗿𝗲...");
                
                try {
                    const storeImgPath = await createStoreImage(event.senderID, senderName, formatMoney);
                    return message.reply({
                        attachment: fs.createReadStream(storeImgPath)
                    }, () => {
                        if (fs.existsSync(storeImgPath)) fs.unlinkSync(storeImgPath);
                    });
                } catch(e) {
                    return message.reply("❌ Error opening store: " + e.message);
                }
            }

            const pack = packages[packKey];
            if (!pack) return message.reply("❌ Invalid package number. Please check the store image.");

            if (userMoney < pack.price) {
                return message.reply(`❌ 𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝘁 𝗙𝘂𝗻𝗱𝘀!\nYou need ${pack.label} coins for ${pack.name}. Your balance: ${(userMoney/M).toFixed(1)}M.`);
            }

            await usersData.set(event.senderID, { money: userMoney - pack.price });

            let currentExpiry = Date.now();
            let start = Date.now();
            if (vipDb.users[event.senderID] && vipDb.users[event.senderID].expiry > Date.now()) {
                currentExpiry = vipDb.users[event.senderID].expiry;
                start = vipDb.users[event.senderID].start || Date.now();
            }
            
            const newExpiry = currentExpiry + (pack.days * 24 * 60 * 60 * 1000);
            vipDb.users[event.senderID] = { expiry: newExpiry, start: start };
            fs.writeJsonSync(dbPath, vipDb);

            return message.reply(`✅ 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗽𝘂𝗿𝗰𝗵𝗮𝘀𝗲𝗱 ${pack.name}!\n${pack.label} coins deducted.\nType '/vip info' to see your card!`);
        }

        // --- 3. SHOW LOCKED VIP COMMANDS LIST ---
        if (action === "cmd") {
            let cmdText = `𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐕𝐈𝐏 𝐜𝐨𝐦𝐦𝐚𝐧𝐝\n\n`;
            vipDb.commands.forEach((cmd, index) => {
                cmdText += `${getUnicodeNumber(index + 1)}. ${cmd}\n`;
            });
            return message.reply(cmdText);
        }

        // --- 4. SHOW VIP LIST ---
        if (action === "list") {
            const userIDs = Object.keys(vipDb.users);
            if (userIDs.length === 0) return message.reply("No VIP members found.");
            
            let listText = `👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠𝗕𝗘𝗥𝗦\n\n`;
            let count = 1;
            
            for (let uid of userIDs) {
                if (vipDb.users[uid].expiry > Date.now()) {
                    let name = "Unknown";
                    try {
                        const uData = await usersData.get(uid);
                        name = uData.name;
                    } catch(e) {}
                    
                    const startD = new Date(vipDb.users[uid].start || Date.now()).toLocaleDateString("en-GB");
                    const endD = new Date(vipDb.users[uid].expiry).toLocaleDateString("en-GB");
                    
                    listText += `${count}. ${name}\n   Start: ${startD} | Exp: ${endD}\n`;
                    count++;
                }
            }
            return message.reply(listText);
        }

        // --- 5. ADMIN ADD ---
        if (action === "add" && isAdmin) {
            const type = args[1]?.toLowerCase();
            if (type === "cmd") {
                const cmdName = args.slice(2).join(" ");
                if (!cmdName) return message.reply("❌ Format: /vip add cmd <name>");
                if (!vipDb.commands.includes(cmdName)) {
                    vipDb.commands.push(cmdName);
                    fs.writeJsonSync(dbPath, vipDb);
                }
                return message.reply(`✅ Added '${cmdName}' to VIP command list.`);
            } else {
                const mentionID = Object.keys(event.mentions)[0] || args[1];
                const days = parseInt(args[2] || args[args.length - 1]);
                if (!mentionID || isNaN(days)) return message.reply("❌ Format: /vip add @mention [days]");

                const newExpiry = Date.now() + (days * 24 * 60 * 60 * 1000);
                vipDb.users[mentionID] = { expiry: newExpiry, start: Date.now() };
                fs.writeJsonSync(dbPath, vipDb);
                return message.reply(`✅ Added VIP to user for ${days} days.`);
            }
        }

        // --- 6. ADMIN REMOVE ---
        if (action === "remove" && isAdmin) {
            const type = args[1]?.toLowerCase();
            if (type === "cmd") {
                const cmdName = args.slice(2).join(" ");
                if (!cmdName) return message.reply("❌ Format: /vip remove cmd <name>");
                vipDb.commands = vipDb.commands.filter(c => c.toLowerCase() !== cmdName.toLowerCase());
                fs.writeJsonSync(dbPath, vipDb);
                return message.reply(`✅ Removed '${cmdName}' from VIP command list.`);
            } else {
                const mentionID = Object.keys(event.mentions)[0] || args[1];
                if (!mentionID || !vipDb.users[mentionID]) return message.reply("❌ User is not VIP or ID invalid.");

                delete vipDb.users[mentionID];
                fs.writeJsonSync(dbPath, vipDb);
                return message.reply("✅ Removed user's VIP status.");
            }
        }
    }
};

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
    ctx.stroke();
}

// --- HELPER: HONEYCOMB TEXTURE (From ATM Card image) ---
function drawHoneycombBackground(ctx, width, height) {
    const r = 18; // Hexagon radius
    const w = Math.sqrt(3) * r;
    const h = 2 * r;
    
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)"; // Very subtle bright lines for texture

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

// --- REDESIGNED DARK PREMIUM STORE MENU ---
async function createStoreImage(uid, name, balance) {
    const canvas = createCanvas(800, 1100);
    const ctx = canvas.getContext("2d");

    // 1. Solid Dark Background matching ATM card
    ctx.fillStyle = "#111115"; 
    ctx.fillRect(0, 0, 800, 1100);
    
    // 2. Draw Honeycomb Texture
    drawHoneycombBackground(ctx, 800, 1100);

    // 3. Header Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 45px Arial";
    ctx.fillText(`Hey ${name} 🎀`, 50, 80);
    ctx.font = "35px Arial";
    ctx.fillText("Select a plan using 'VIP buy <number>'", 50, 140);
    ctx.fillText("Max Limit: 30 Days", 50, 190);

    // 4. Redesigned Profile Card
    ctx.fillStyle = "rgba(30, 30, 36, 0.8)"; // Slightly lighter box
    ctx.strokeStyle = "rgba(255, 215, 0, 0.2)"; // Subtle gold trim
    ctx.lineWidth = 2;
    roundRect(ctx, 50, 230, 700, 140, 20);

    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 300, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 70, 250, 100, 100);
        ctx.restore();
        // Gold Ring instead of Magenta to match ATM vibes
        ctx.beginPath();
        ctx.arc(120, 300, 50, 0, Math.PI * 2);
        ctx.strokeStyle = "#f1c40f"; 
        ctx.lineWidth = 4;
        ctx.stroke();
    } catch(e) {}

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.fillText(name, 200, 290);
    ctx.fillStyle = "#f1c40f"; // Gold
    ctx.font = "25px Arial";
    ctx.fillText(`Baby, Your Balance: ${balance}`, 200, 330);

    // 5. Main Section Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.fillText("👑 SHIZUKA VIP PREMIUM STORE", 50, 430);

    // 6. Packages Grid: FIXED TEXT OVERLAP
    let startX = 50;
    let startY = 480;

    const packIcons = {
        "1": "⏱️", "2": "⏱️⏱️", "3": "⏱️📅", "4": "⏱️📅📅", "5": "📅", "6": "📅⚙️", "7": "📅📅", "8": "📅📅🌟", "9": "📅📅🪐", "10": "📅📅📅👑"
    };

    for (let i = 1; i <= 10; i++) {
        const pack = packages[i.toString()];
        
        ctx.fillStyle = "rgba(22, 22, 28, 0.9)"; // Darker card background
        ctx.strokeStyle = "rgba(0, 255, 204, 0.4)"; // Cyan border
        ctx.lineWidth = 1.5;
        roundRect(ctx, startX, startY, 330, 100, 15);
        
        // Number and Name (Top Row)
        ctx.fillStyle = "#00ffcc"; // Bright Cyan Number
        ctx.font = "bold 22px Arial";
        ctx.fillText(`${i}.`, startX + 20, startY + 35);
        
        ctx.fillStyle = "#ffffff"; // Bold white name
        ctx.fillText(pack.name, startX + 55, startY + 35);
        
        // Cost (Bottom Row)
        ctx.fillStyle = "#f1c40f"; // Polished Gold for cost
        ctx.font = "bold 20px Arial";
        ctx.fillText(`Cost: ${pack.label}`, startX + 20, startY + 75);

        // Icon (Far Right side)
        ctx.font = "28px Arial";
        ctx.fillText(packIcons[i.toString()], startX + 250, startY + 60);

        // Grid Math
        if (i % 2 !== 0) {
            startX = 420; // Move to right col
        } else {
            startX = 50;  // Reset to left col
            startY += 120; // Move down a row
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

    // 1. Dark Premium Background matching reference
    ctx.fillStyle = "#111115";
    ctx.fillRect(0, 0, 800, 450);
    
    // 2. Add Honeycomb Texture
    drawHoneycombBackground(ctx, 800, 450);

    // 3. Bright Gold Gradient
    const goldGradient = ctx.createLinearGradient(0, 0, 800, 450);
    goldGradient.addColorStop(0, "#FBEA9D"); 
    goldGradient.addColorStop(0.3, "#D5A03A"); 
    goldGradient.addColorStop(0.5, "#F7D070"); 
    goldGradient.addColorStop(0.7, "#B37B22"); 
    goldGradient.addColorStop(1, "#FBEA9D");

    // 4. Inner Gold Border
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

    // 5. Card Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial"; 
    ctx.fillText("SHIZUKA BANK", 40, 70);
    
    ctx.fillStyle = "#888888";
    ctx.font = "16px Arial";
    ctx.fillText("PREMIUM ELITE", 42, 95);

    // 6. User Avatar
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

    // 7. Faux "EMV Chip"
    ctx.shadowBlur = 3;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    
    ctx.fillStyle = goldGradient;
    // Drawing a simple rounded rect chip
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

    // 8. Fake Card Number / Formatting
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 5;

    ctx.fillStyle = "#E8E8E8";
    ctx.font = "20px Arial";
    ctx.fillText("MEMBER ID", 40, 240);
    
    ctx.fillStyle = "#FFFFFF"; 
    ctx.font = "bold 44px monospace"; // Monospace gives a good bank card number look
    // Break UID into 4 chunks safely just for aesthetics
    const displayId = (uid + "000000000000").substring(0, 16).match(/.{1,4}/g).join("  ");
    ctx.fillText(displayId, 40, 290);

    // 9. Name and Expiry
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 26px Arial";
    ctx.fillText(name.toUpperCase(), 40, 390);

    ctx.fillStyle = "#888888";
    ctx.font = "bold 16px Arial";
    ctx.fillText("VALID THRU", 500, 365);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Arial";
    ctx.fillText(expiry, 500, 395);

    // Logo spoof in bottom right
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "italic bold 40px Arial";
    ctx.fillText("VISA", 670, 395);

    // 10. Glossy Reflection Overlay
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
