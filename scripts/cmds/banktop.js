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
                name: "banktop",
                aliases: ["topbank", "banklb", "topb"],
                version: "1.0",
                author: "Zisan 🐍",
                countDown: 5,
                role: 0,
                category: "economy",
                description: {
                        vi: "Xem bảng xếp hạng số dư ngân hàng",
                        en: "Show leaderboard of bank balances"
                },
                guide: {
                        vi: "{pn} [số lượng]",
                        en: "{pn} [limit]"
                }
        },

        langs: {
                vi: {
                        title: "Top Bank Users",
                        none: "Chưa có ai gửi tiền vào ngân hàng",
                        total: "Total users with bank money: %1"
                },
                en: {
                        title: "Top Bank Users",
                        none: "No one has money in bank yet",
                        total: "Total users with bank money: %1"
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
                                amount: (u.data && u.data.economy && typeof u.data.economy.bankBalance === "number") ? u.data.economy.bankBalance : 0
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

                const leaderboardImage = await createBankLeaderboard(ranked.slice(0, limit));
                leaderboardImage.path = banktop_${randomString(10)}.png;

                return message.reply({
                        attachment: leaderboardImage
                });
        }
};

async function createBankLeaderboard(rankedUsers) {
        const canvas = Canvas.createCanvas(800, 1200);
        const ctx = canvas.getContext("2d");

        // Load background image
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

        // Draw title with glow
        ctx.font = "bold 42px BeVietnamPro-Bold";
        ctx.textAlign = "center";
        ctx.fillStyle = "#00FFFF";

        ctx.shadowColor = "#00FFFF";
        ctx.shadowBlur = 25;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#00FFFF";
        ctx.strokeText("Top Bank Users", 400, 80);

        ctx.shadowBlur = 0;
        ctx.fillText("Top Bank Users", 400, 80);

        // Draw top 3 users prominently
        if (rankedUsers.length > 0) await drawTop3Users(ctx, rankedUsers.slice(0, 3));

        // Draw remaining users in table format
        if (rankedUsers.length > 3) await drawUserTable(ctx, rankedUsers.slice(3), 4);

        return canvas.createPNGStream();
}

async function drawTop3Users(ctx, top3Users) {
        const positions = [
                { x: 400, y: 250, size: 120, rank: "#1", color: "#FFD700", medalColor: "#FFD700" },
                { x: 150, y: 280, size: 100, rank: "#2", color: "#C0C0C0", medalColor: "#C0C0C0" },
                { x: 650, y: 280, size: 100, rank: "#3", color: "#CD7F32", medalColor: "#CD7F32" }
        ];

        for (let i = 0; i < Math.min(top3Users.length, 3); i++) {
                const user = top3Users[i];
                const pos = positions[i];

                drawHexagon(ctx, pos.x, pos.y - 80, 35, pos.medalColor);
                
                ctx.font = "bold 20px BeVietnamPro-Bold";
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.fillText(pos.rank, pos.x, pos.y - 75);

                try {
                        const avatar = await Canvas.loadImage(user.avatar);
                        drawCircularImage(ctx, avatar, pos.x, pos.y, pos.size);
                } catch (e) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, pos.size / 2, 0, 2 * Math.PI);
                        ctx.fillStyle = "#666666";
                        ctx.fill();
                }

                drawHexagon(ctx, pos.x, pos.y, pos.size / 2 + 10, pos.color, true);

                ctx.font = "bold 18px BeVietnamPro-Bold";
                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "center";
                const maxNameWidth = pos.size + 40;
                const truncatedName = truncateText(ctx, user.name, maxNameWidth);
                ctx.fillText(truncatedName, pos.x, pos.y + pos.size / 2 + 35);

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

                ctx.fillStyle = i % 2 === 0 ? "rgba(0, 255, 255, 0.1)" : "rgba(0, 255, 255, 0.05)";
                ctx.fillRect(50, y - 15, 700, rowHeight);

                ctx.beginPath();
                ctx.arc(100, y + 5, 15, 0, 2 * Math.PI);
                ctx.fillStyle = getRankColor(rank);
                ctx.fill();

                ctx.font = "bold 14px BeVietnamPro-Bold";
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.fillText(#${rank}, 100, y + 10);

                try {
                        const avatar = await Canvas.loadImage(user.avatar);
                        drawCircularImage(ctx, avatar, 160, y + 5, 25);
                } catch (e) {
                        ctx.beginPath();
                        ctx.arc(160, y + 5, 12, 0, 2 * Math.PI);
                        ctx.fillStyle = "#666666";
                        ctx.fill();
                }

                ctx.font = "18px BeVietnamPro-SemiBold";
                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "left";
                const truncatedName = truncateText(ctx, user.name, 300);
                ctx.fillText(truncatedName, 200, y + 12);

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
        if (rank <= 5) return "#FFD700";
        if (rank <= 10) return "#C0C0C0";
        return "#CD7F32";
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
