const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// Database & Constant setup
const dataFolder = path.join(__dirname, "../../data");
const dbPath = path.join(dataFolder, "vip.json");
const M = 1000000; // 1 Million

if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, {});

// VIP Packages Pricing
const packages = {
    "1": { days: 1, price: 1 * M, label: "1M" },
    "3": { days: 3, price: 2 * M, label: "2M" },
    "10": { days: 10, price: 5 * M, label: "5M" },
    "30": { days: 30, price: 10 * M, label: "10M" }
};

module.exports = {
    config: {
        name: "vip",
        version: "1.0",
        author: "zisan",
        countDown: 5,
        role: 0,
        shortDescription: "VIP System",
        longDescription: "Buy VIP, check status, or see locked commands.",
        category: "system",
        guide: "{pn} info | buy [1/3/10] | cmd | add @mention [days] | remove @mention"
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

        // --- 3. SHOW LOCKED VIP COMMANDS LIST ---
        if (action === "cmd") {
            const vipCmds = `👑 𝗩𝗜𝗣 𝗟𝗢𝗖𝗞𝗘𝗗 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦\n\n` +
                            `• 𝗮𝗿𝘁 - Transform photos into various art styles.\n` +
                            `• 𝗲𝗱𝗶𝘁 - Edit photos via AI prompts.\n` +
                            `• 𝗽𝗮𝗶𝗿 - Pair with specific user via reply/mention.\n\n` +
                            `💡 Buy VIP to get full access to these premium tools!`;
            return message.reply(vipCmds);
        }

        // --- 4. ADMIN ADD VIP ---
        if (action === "add" && isAdmin) {
            const mentionID = Object.keys(event.mentions)[0] || args[1];
            const days = parseInt(args[2] || args[args.length - 1]);

            if (!mentionID || isNaN(days)) return message.reply("❌ Format: /vip add @mention [days]");

            const newExpiry = Date.now() + (days * 24 * 60 * 60 * 1000);
            vipDb[mentionID] = { expiry: newExpiry };
            fs.writeJsonSync(dbPath, vipDb);

            return message.reply(`✅ Added VIP to user for ${days} days.`);
        }

        // --- 5. ADMIN REMOVE VIP ---
        if (action === "remove" && isAdmin) {
            const mentionID = Object.keys(event.mentions)[0] || args[1];
            if (!mentionID || !vipDb[mentionID]) return message.reply("❌ User is not VIP or ID invalid.");

            delete vipDb[mentionID];
            fs.writeJsonSync(dbPath, vipDb);
            return message.reply("✅ Removed user's VIP status.");
        }

        return message.reply("👑 𝗦𝗛𝗜𝗭𝗨𝗞𝗔 𝗩𝗜𝗣 𝗦𝗬𝗦𝗧𝗘𝗠\n- /vip info (View your card)\n- /vip buy (View packages)\n- /vip cmd (View VIP commands)\n- /vip buy [1/3/10] (Purchase)");
    }
};

// --- PREMIUM CANVAS CARD GENERATOR ---
async function createVipCard(uid, name, expiry) {
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext("2d");

    // 1. Dark Metallic Background
    const bgGradient = ctx.createLinearGradient(0, 0, 800, 450);
    bgGradient.addColorStop(0, "#1e1e1e");
    bgGradient.addColorStop(0.3, "#383838");
    bgGradient.addColorStop(0.5, "#141414");
    bgGradient.addColorStop(0.8, "#2d2d2d");
    bgGradient.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 800, 450);

    // 2. Premium Metallic Gold Gradient (for text and borders)
    const goldGradient = ctx.createLinearGradient(0, 0, 800, 450);
    goldGradient.addColorStop(0, "#BF953F");
    goldGradient.addColorStop(0.25, "#FCF6BA");
    goldGradient.addColorStop(0.5, "#B38728");
    goldGradient.addColorStop(0.75, "#FBF5B7");
    goldGradient.addColorStop(1, "#AA771C");

    // 3. Inner Gold Border with Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    ctx.strokeStyle = goldGradient;
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 770, 420);
    
    // Reset shadow for background elements
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 4. Subtle Hex/Line Pattern for texture
    ctx.strokeStyle = "rgba(191, 149, 63, 0.08)";
    ctx.lineWidth = 1.5;
    for (let i = -400; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 450, 450);
        ctx.stroke();
    }

    // 5. Card Header
    ctx.fillStyle = goldGradient;
    ctx.font = "bold 38px 'Arial'"; // Using standard font but enhanced with gradient & shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillText("SHIZUKA PREMIUM VIP", 40, 75);

    // 6. User Avatar
    try {
        const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        
        // Avatar Ring Shadow
        ctx.shadowColor = "rgba(0,0,0, 0.8)";
        ctx.shadowBlur = 20;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(130, 240, 85, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 45, 155, 170, 170);
        ctx.restore();
        
        // Golden Ring around Avatar
        ctx.beginPath();
        ctx.arc(130, 240, 85, 0, Math.PI * 2);
        ctx.strokeStyle = goldGradient;
        ctx.lineWidth = 6;
        ctx.stroke();
    } catch(e) { /* avatar skip */ }

    // Reset Shadows for clean text
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // 7. User Details
    ctx.fillStyle = "#FFFFFF"; // Crisp white for name to pop against gold
    ctx.font = "bold 42px Arial";
    ctx.fillText(name.toUpperCase(), 250, 220);

    ctx.fillStyle = "#B0B0B0"; // Silver color for ID
    ctx.font = "bold 22px Arial";
    ctx.fillText(`MEMBER ID: ${uid}`, 250, 260);

    // 8. VIP Expiry Details
    ctx.fillStyle = goldGradient;
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "right";
    ctx.fillText("VALID THRU", 745, 380);
    
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(expiry, 745, 415);

    // 9. Faux "Chip" (Simulates a physical credit card chip)
    ctx.shadowBlur = 5;
    ctx.strokeStyle = goldGradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 360, 50, 40);
    ctx.strokeRect(45, 365, 40, 30);
    ctx.beginPath(); ctx.moveTo(40, 380); ctx.lineTo(55, 380); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90, 380); ctx.lineTo(75, 380); ctx.stroke();
    
    // 10. Glossy Reflection Overlay (Makes it look like shiny plastic/metal)
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
