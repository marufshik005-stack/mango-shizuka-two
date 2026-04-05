const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// Database & Constant setup
const dataFolder = path.join(__dirname, "../../data");
const dbPath = path.join(dataFolder, "vip.json");
const M = 1000000; // 1 Million

if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, {});

// VIP Packages Pricing (Using 'M' for clarity)
const packages = {
    "1": { days: 1, price: 1 * M, label: "1M" },
    "3": { days: 3, price: 2 * M, label: "2M" },
    "10": { days: 10, price: 5 * M, label: "5M" },
    "30": { days: 30, price: 10 * M, label: "10M" }
};

module.exports = {
    config: {
        name: "vip",
        version: "1.0.0",
        author: "zisan",
        countDown: 5,
        role: 0,
        shortDescription: "VIP System",
        longDescription: "Buy VIP with simplified pricing display.",
        category: "system",
        guide: "{pn} info | buy [1/3/10] | add @mention [days] | remove @mention"
    },

    onStart: async function ({ api, event, args, message, Currencies }) {
        const vipDb = fs.readJsonSync(dbPath);
        const action = args[0]?.toLowerCase();
        const isAdmin = global.GoatBot.config.adminBot.includes(event.senderID);

        // --- 1. SHOW VIP INFO & CARD ---
        if (!action || action === "info") {
            const isUserVip = isAdmin || (vipDb[event.senderID] && vipDb[event.senderID].expiry > Date.now());
            
            if (!isUserVip) {
                return message.reply("❌ You are not a VIP member.\nBuy VIP using: /vip buy [1/3/10]");
            }

            message.reply("⌛ 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗩𝗜𝗣 𝗖𝗮𝗿𝗱...");
            
            const userInfo = await api.getUserInfo(event.senderID);
            const userName = userInfo[event.senderID].name;
            
            let expiryText = "𝗙𝗢𝗥𝗘𝗩𝗘𝗥";
            if (!isAdmin && vipDb[event.senderID]) {
                const date = new Date(vipDb[event.senderID].expiry);
                expiryText = date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString("en-GB");
            }

            try {
                const imgPath = await createVipCard(event.senderID, userName, expiryText);
                return message.reply({
                    body: `👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗠𝗘𝗠𝗕𝗘𝗥 👑\n𝗡𝗮𝗺𝗲: ${userName}\n𝗩𝗮𝗹𝗶𝗱 𝗧𝗵𝗿𝘂: ${expiryText}\n\nEnjoy your premium features!`,
                    attachment: fs.createReadStream(imgPath)
                }, () => {
                    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                });
            } catch (err) {
                return message.reply("❌ Error generating VIP card.");
            }
        }

        // --- 2. BUY VIP ---
        if (action === "buy") {
            const packKey = args[1];
            const pack = packages[packKey];

            if (!pack) {
                return message.reply(`🛒 𝗩𝗜𝗣 𝗣𝗔𝗖𝗞𝗔𝗚𝗘𝗦:\n𝟭 𝗗𝗮𝘆: ${packages["1"].label} coins (Type: /vip buy 1)\n𝟯 𝗗𝗮𝘆𝘀: ${packages["3"].label} coins (Type: /vip buy 3)\n𝟭𝟬 𝗗𝗮𝘆𝘀: ${packages["10"].label} coins (Type: /vip buy 10)`);
            }

            const userMoney = await Currencies.getMoney(event.senderID);
            if (userMoney < pack.price) {
                return message.reply(`❌ 𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝘁 𝗙𝘂𝗻𝗱𝘀!\nYou need ${pack.label} coins for this package.`);
            }

            await Currencies.decreaseMoney(event.senderID, pack.price);

            let currentExpiry = Date.now();
            if (vipDb[event.senderID] && vipDb[event.senderID].expiry > Date.now()) {
                currentExpiry = vipDb[event.senderID].expiry;
            }
            
            const newExpiry = currentExpiry + (pack.days * 24 * 60 * 60 * 1000);
            vipDb[event.senderID] = { expiry: newExpiry };
            fs.writeJsonSync(dbPath, vipDb);

            return message.reply(`✅ 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗽𝘂𝗿𝗰𝗵𝗮𝘀𝗲𝗱 ${pack.days} 𝗗𝗮𝘆𝘀 𝗩𝗜𝗣!\n${pack.label} coins deducted from your balance.\nType '/vip info' to see your card!`);
        }

        // --- 3. ADMIN ADD VIP ---
        if (action === "add" && isAdmin) {
            const mentionID = Object.keys(event.mentions)[0] || args[1];
            const days = parseInt(args[2] || args[args.length - 1]);

            if (!mentionID || isNaN(days)) return message.reply("❌ Format: /vip add @mention [days]");

            const newExpiry = Date.now() + (days * 24 * 60 * 60 * 1000);
            vipDb[mentionID] = { expiry: newExpiry };
            fs.writeJsonSync(dbPath, vipDb);

            return message.reply(`✅ Added VIP to user for ${days} days.`);
        }

        // --- 4. ADMIN REMOVE VIP ---
        if (action === "remove" && isAdmin) {
            const mentionID = Object.keys(event.mentions)[0] || args[1];
            if (!mentionID || !vipDb[mentionID]) return message.reply("❌ User is not VIP or ID invalid.");

            delete vipDb[mentionID];
            fs.writeJsonSync(dbPath, vipDb);
            return message.reply("✅ Removed user's VIP status.");
        }

        return message.reply("👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗦𝗬𝗦𝗧𝗘𝗠\n- /vip info (View your card)\n- /vip buy (View packages)\n- /vip buy [1/3/10] (Purchase)");
    }
};

// --- PREMIUM CANVAS CARD GENERATOR ---
async function createVipCard(uid, name, expiry) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext("2d");

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 800, 450);
    gradient.addColorStop(0, "#0a0a0a");
    gradient.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 450);

    // Gold Border
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 780, 430);

    // Design Lines
    ctx.strokeStyle = "rgba(212, 175, 55, 0.1)";
    ctx.lineWidth = 1;
    for(let i=0; i<800; i+=30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i-100, 450); ctx.stroke();
    }

    ctx.fillStyle = "#D4AF37";
    ctx.font = "bold 40px Arial";
    ctx.fillText("SHIZUKA PREMIUM VIP", 40, 70);

    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 220, 80, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 140, 160, 160);
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(120, 220, 80, 0, Math.PI * 2);
        ctx.strokeStyle = "#D4AF37";
        ctx.lineWidth = 5;
        ctx.stroke();
    } catch(e) { /* avatar skip */ }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 45px Arial";
    ctx.fillText(name.toUpperCase(), 230, 200);

    ctx.fillStyle = "#A0A0A0";
    ctx.font = "25px Arial";
    ctx.fillText(`MEMBER ID: ${uid}`, 230, 240);

    // VALID THRU (Bottom Right - Golden Text)
    ctx.fillStyle = "#D4AF37";
    ctx.font = "bold 25px Arial";
    ctx.textAlign = "right";
    ctx.fillText("VALID THRU", 750, 390);
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(expiry, 750, 420);

    const tempPath = path.join(dataFolder, `vip_card_${uid}.png`);
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}
