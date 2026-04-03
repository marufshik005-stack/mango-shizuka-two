const Canvas = require("canvas");
const { randomString } = global.utils;

// Register fonts
Canvas.registerFont(${__dirname}/assets/font/BeVietnamPro-Bold.ttf, {
        family: "BeVietnamPro-Bold"
});
Canvas.registerFont(${__dirname}/assets/font/BeVietnamPro-SemiBold.ttf, {
        family: "BeVietnamPro-SemiBold"
});

module.exports = {
        config: {
                name: "wallettop",
                aliases: ["topwallet", "walletlb", "topmoney","top"],
                version: "1.0",
                author: "𝐙ɪsᴀɴ 🐍",
                countDown: 5,
                role: 0,
                category: "economy",
                description: {
                        vi: "Xem bảng xếp hạng số dư ví",
                        en: "Show leaderboard of wallet balances"
                },
                guide: {
                        vi: "{pn} [số lượng]",
                        en: "{pn} [limit]"
                }
        },

        langs: {
                vi: {
                        title: "TOP RICHEST USERS",
                        none: "Chưa có ai có tiền trong ví",
                        total: "Total users with wallet money: %1"
                },
                en: {
                        title: "TOP RICHEST USERS",
                        none: "No one has money in wallet yet",
                        total: "Total users with wallet money: %1"
                }
        },

        onStart: async function ({ message, args, usersData, getLang, api }) {
                const limitArg = parseInt(args[0]);
                const limit = Number.isInteger(limitArg) && limitArg > 0 ? Math.min(limitArg, 15) : 15;

                const allUsers = await usersData.getAll();
                const ranked = allUsers
                        .map(u => ({
                                userID: u.userID,
                                name: u.name || u.userID,
                                amount: typeof u.money === "number" ? u.money : 0
                        }))
                        .filter(u => u.amount > 0)
                        .sort((a, b) => b.amount - a.amount);

                if (ranked.length === 0)
                        return message.reply(getLang("none"));

                // Get avatar URLs for users
                for (let i = 0; i < Math.min(ranked.length, limit); i++) {
                        try {
                                ranked[i].avatar = await usersData.getAvatarUrl(ranked[i].userID);
                        } catch (e) {
                                ranked[i].avatar = "https://i.imgur.com/x6I6Yp9.png"; // Default avatar
                        }
                }

                const leaderboardImage = await createWalletLeaderboard(ranked.slice(0, limit), getLang("title"));
                leaderboardImage.path = wallettop_${randomString(10)}.png;

                return message.reply({
                        attachment: leaderboardImage
                });
        }
};

async function createWalletLeaderboard(rankedUsers, title) {
        const canvas = Canvas.createCanvas(800, 1200);
        const ctx = canvas.getContext("2d");

        // Load background image (from external URL)
        try {
                const background = await Canvas.loadImage("https://i.postimg.cc/hP7LMd5y/1758903253392.png");
                ctx.drawImage(background, 0, 0, 800, 1200);
        } catch (e) {
                // Fallback gradient background
                const gradient = ctx.createLinearGradient(0, 0, 0, 1200);
                gradient.addColorStop(0, "#1a1a2e");
                gradient.addColorStop(1, "#16213e");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 800, 1200);
        }

        // Draw title
        ctx.font = "bold 36px BeVietnamPro-Bold";
        ctx.fillStyle = "#00FFFF";
        ctx.textAlign = "center";
        ctx.fillText(title, 400, 80);

        // Draw top 3 users prominently
        if (rankedUsers.length > 0) await drawTop3Users(ctx, rankedUsers.slice(0, 3));

        // Draw remaining users in table format
        if (rankedUsers.length > 3) await drawUserTable(ctx, rankedUsers.slice(3), 4);

        return canvas.createPNGStream();
}

async function drawTop3Users(ctx, top3Users) {
        const positions = [
                { x: 400, y: 250, size: 120, rank: "#1", color: "#FFD700", medalColor: "#FFD700" }, // Center - 1st place
                { x: 150, y: 280, size: 100, rank: "#2", color: "#C0C0C0", medalColor: "#C0C0C0" }, // Left - 2nd place  
                { x: 650, y: 280, size: 100, rank: "#3", color: "#CD7F32", medalColor: "#CD7F32" }  // Right - 3rd place
        ];

        for (let i = 0; i < Math.min(top3Users.length, 3); i++) {
                const user = top3Users[i];
                const pos = positions[i];

                // Draw rank badge (hexagon)
                drawHexagon(ctx, pos.x, pos.y - 80, 35, pos.medalColor);
                
                // Draw rank number
                ctx.font = "bold 20px BeVietnamPro-Bold";
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.fillText(pos.rank, pos.x, pos.y - 75);

                // Draw avatar (circular)
                try {
                        const avatar = await Canvas.loadImage(user.avatar);
                        drawCircularImage(ctx, avatar, pos.x, pos.y, pos.size);
                } catch (e) {
                        // Draw default avatar circle
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, pos.size / 2, 0, 2 * Math.PI);
                        ctx.fillStyle = "#666666";
                        ctx.fill();
                }

                // Draw hexagon border around avatar
                drawHexagon(ctx, pos.x, pos.y, pos.size / 2 + 10, pos.color, true);

                // Draw username
                ctx.font = "bold 18px BeVietnamPro-Bold";
                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "center";
                const maxNameWidth = pos.size + 40;
                const truncatedName = truncateText(ctx, user.name, maxNameWidth);
                ctx.fillText(truncatedName, pos.x, pos.y + pos.size / 2 + 35);

                // Draw amount
                ctx.font = "16px BeVietnamPro-SemiBold";
                ctx.fillStyle = pos.color;
                const formattedAmount = formatAmount(user.amount);
                ctx.fillText(formattedAmount, pos.x, pos.y + pos.size / 2 + 55);
        }
}

async function drawUserTable(ctx, users, startRank) {
        const startY = 450;
        const rowHeight = 45;
        const maxRows = Math.min(users.length, 12);

        for (let i = 0; i < maxRows; i++) {
                const user = users[i];
                const y = startY + i * rowHeight;
                const rank = startRank + i;

                // Draw row background with alternating colors
                ctx.fillStyle = i % 2 === 0 ? "rgba(0, 255, 255, 0.1)" : "rgba(0, 255, 255, 0.05)";
                ctx.fillRect(50, y - 15, 700, rowHeight);

                // Draw rank circle
                ctx.beginPath();
                ctx.arc(100, y + 5, 15, 0, 2 * Math.PI);
                ctx.fillStyle = getRankColor(rank);
                ctx.fill();

                // Draw rank number
                ctx.font = "bold 14px BeVietnamPro-Bold";
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.fillText(#${rank}, 100, y + 10);

                // Draw small avatar
                try {
                        const avatar = await Canvas.loadImage(user.avatar);
                        drawCircularImage(ctx, avatar, 160, y + 5, 25);
                } catch (e) {
                        // Draw default avatar
                        ctx.beginPath();
                        ctx.arc(160, y + 5, 12, 0, 2 * Math.PI);
                        ctx.fillStyle = "#666666";
                        ctx.fill();
                }

                // Draw username
                ctx.font = "18px BeVietnamPro-SemiBold";
                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "left";
                const truncatedName = truncateText(ctx, user.name, 300);
                ctx.fillText(truncatedName, 200, y + 12);

                // Draw amount
                ctx.font = "16px BeVietnamPro-SemiBold";
                ctx.fillStyle = "#FFD700";
                ctx.textAlign = "right";
                const formattedAmount = formatAmount(user.amount);
                ctx.fillText(formattedAmount, 720, y + 12);
        }
}

function drawHexagon(ctx, x, y, radius, color, strokeOnly = false) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = x + radius * Math.cos(angle);
                const py = y + radius * Math.sin(angle);
                if (i === 0) {
                        ctx.moveTo(px, py);
                } else {
                        ctx.lineTo(px, py);
                }
        }
        ctx.closePath();
        
        if (strokeOnly) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.stroke();
        } else {
                ctx.fillStyle = color;
                ctx.fill();
        }
}

function drawCircularImage(ctx, image, x, y, size) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
        ctx.restore();
}

function getRankColor(rank) {
        if (rank <= 5) return "#FFD700";  // Gold for top 5
        if (rank <= 10) return "#C0C0C0"; // Silver for 6-10
        return "#CD7F32"; // Bronze for others
}

function formatAmount(amount) {
        if (amount >= 1e12) return (amount / 1e12).toFixed(1) + "T$";
        if (amount >= 1e9) return (amount / 1e9).toFixed(1) + "B$";
        if (amount >= 1e6) return (amount / 1e6).toFixed(1) + "M$";
        if (amount >= 1e3) return (amount / 1e3).toFixed(1) + "K$";
        return amount + "$";
}

function truncateText(ctx, text, maxWidth) {
        let truncated = text;
        while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
        }
        if (truncated.length < text.length) {
                truncated += "...";
        }
        return truncated;
}
