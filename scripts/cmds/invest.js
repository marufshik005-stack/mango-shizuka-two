const moment = require("moment-timezone");

function getTimeBasedSeed() {
        const now = Date.now();
        return Math.floor(now / (60 * 1000));
}

function seededRandom(seed, symbol) {
        const x = Math.sin(seed + symbol.charCodeAt(0)) * 10000;
        return x - Math.floor(x);
}

module.exports = {
        config: {
                name: "invest",
                aliases: ["inv", "investment"],
                version: "3.0",
                author: "zisan",
                countDown: 3,
                role: 0,
                description: {
                        vi: "Hệ thống đầu tư nâng cao - mua bán cổ phiếu, crypto, vàng với tính năng stop-loss và leaderboard",
                        en: "Advanced Investment System - trade stocks, crypto, precious metals with stop-loss and leaderboard features"
                },
                category: "economy",
                guide: {
                        vi: "   {pn} market: Xem thị trường đầu tư\n   {pn} buy <symbol> <amount>: Mua tài sản\n   {pn} sell <symbol> <amount>: Bán tài sản\n   {pn} portfolio: Xem danh mục đầu tư\n   {pn} price <symbol>: Xem giá cụ thể\n   {pn} history: Xem lịch sử giao dịch\n   {pn} stoploss <symbol> <price>: Đặt lệnh stop-loss\n   {pn} leaderboard: Xem bảng xếp hạng\n   {pn} trends: Xem xu hướng thị trường",
                        en: "   {pn} market: View investment market\n   {pn} buy <symbol> <amount>: Buy assets\n   {pn} sell <symbol> <amount>: Sell assets\n   {pn} portfolio: View your portfolio\n   {pn} price <symbol>: View specific price\n   {pn} history: View transaction history\n   {pn} stoploss <symbol> <price>: Set stop-loss order\n   {pn} leaderboard: View top investors\n   {pn} trends: View market trends"
                }
        },

        langs: {
                vi: {
                        marketTitle: "💰 SHIZUKA'S INVESTMENT MARKET 💰",
                        buySuccess: "✅ Mua thành công %1 %2 với giá %3$!",
                        sellSuccess: "✅ Bán thành công %1 %2 với giá %3$!",
                        insufficientFunds: "❌ Không đủ tiền! Cần %1$, bạn có %2$",
                        insufficientShares: "❌ Không đủ %1! Bạn chỉ có %2",
                        invalidAmount: "❌ Số lượng không hợp lệ!",
                        invalidSymbol: "❌ Mã đầu tư không hợp lệ! Dùng 'invest market' để xem danh sách",
                        portfolioTitle: "💼 SHIZUKA'S PORTFOLIO 💼",
                        noInvestments: "📋 Chưa có khoản đầu tư nào",
                        totalValue: "💎 Tổng giá trị: %1$",
                        totalProfit: "📊 Tổng lãi/lỗ: %1$ (%2%)",
                        priceInfo: "💰 Giá %1 hiện tại: %2$",
                        historyTitle: "📜 LỊCH SỬ GIAO DỊCH 📜",
                        noHistory: "📋 Chưa có giao dịch nào",
                        profit: "Lãi",
                        loss: "Lỗ"
                },
                en: {
                        marketTitle: "💰 SHIZUKA'S INVESTMENT MARKET 💰",
                        buySuccess: "✅ Successfully bought %1 %2 for %3$!",
                        sellSuccess: "✅ Successfully sold %1 %2 for %3$!",
                        insufficientFunds: "❌ Insufficient funds! Need %1$, you have %2$",
                        insufficientShares: "❌ Insufficient %1! You only have %2",
                        invalidAmount: "❌ Invalid amount!",
                        invalidSymbol: "❌ Invalid symbol! Use 'invest market' to see available assets",
                        portfolioTitle: "💼 SHIZUKA'S PORTFOLIO 💼",
                        noInvestments: "📋 No investments yet",
                        totalValue: "💎 Total Value: %1$",
                        totalProfit: "📊 Total P/L: %1$ (%2%)",
                        priceInfo: "💰 %1 current price: %2$",
                        historyTitle: "📜 TRANSACTION HISTORY 📜",
                        noHistory: "📋 No transactions yet",
                        profit: "Profit",
                        loss: "Loss"
                }
        },

        onStart: async function ({ message, args, event, usersData, getLang }) {
                const { senderID } = event;
                const action = args[0]?.toLowerCase();

                const investmentTypes = {
                        stocks: {
                                AAPL: { basePrice: 180, volatility: 0.04, name: "Apple Inc.", emoji: "🍎" },
                                GOOGL: { basePrice: 140, volatility: 0.05, name: "Google", emoji: "🔍" },
                                MSFT: { basePrice: 380, volatility: 0.03, name: "Microsoft", emoji: "💻" },
                                TSLA: { basePrice: 250, volatility: 0.08, name: "Tesla", emoji: "⚡" },
                                AMZN: { basePrice: 170, volatility: 0.04, name: "Amazon", emoji: "📦" },
                                NVDA: { basePrice: 500, volatility: 0.09, name: "NVIDIA", emoji: "🎮" }
                        },
                        crypto: {
                                BTC: { basePrice: 65000, volatility: 0.08, name: "Bitcoin", emoji: "₿" },
                                ETH: { basePrice: 3500, volatility: 0.10, name: "Ethereum", emoji: "💎" },
                                BNB: { basePrice: 600, volatility: 0.12, name: "Binance", emoji: "🟡" },
                                SOL: { basePrice: 150, volatility: 0.15, name: "Solana", emoji: "🌟" },
                                ADA: { basePrice: 0.6, volatility: 0.14, name: "Cardano", emoji: "💙" },
                                XRP: { basePrice: 0.5, volatility: 0.13, name: "Ripple", emoji: "💧" }
                        },
                        metals: {
                                GOLD: { basePrice: 2050, volatility: 0.02, name: "Gold", emoji: "🥇" },
                                SILVER: { basePrice: 24, volatility: 0.04, name: "Silver", emoji: "🥈" },
                                PLATINUM: { basePrice: 960, volatility: 0.03, name: "Platinum", emoji: "⚪" }
                        }
                };

                const getCurrentPrice = (symbol, allTypes) => {
                        const seed = getTimeBasedSeed();
                        for (const [category, assets] of Object.entries(allTypes)) {
                                if (assets[symbol]) {
                                        const asset = assets[symbol];
                                        const random = seededRandom(seed, symbol);
                                        const change = (random - 0.5) * 2 * asset.volatility;
                                        const currentPrice = asset.basePrice * (1 + change);

                                        return {
                                                price: Math.round(currentPrice * 100) / 100,
                                                change: Math.round(change * 10000) / 100,
                                                category,
                                                ...asset
                                        };
                                }
                        }
                        return null;
                };

                let userData = await usersData.get(senderID);
                
                if (!userData.data) {
                        userData.data = {};
                }
                
                if (!userData.data.investments) {
                        userData.data.investments = {};
                        await usersData.set(senderID, { data: userData.data });
                }
                
                if (!userData.data.investHistory) {
                        userData.data.investHistory = [];
                        await usersData.set(senderID, { data: userData.data });
                }

                if (!userData.data.stopLossOrders) {
                        userData.data.stopLossOrders = {};
                        await usersData.set(senderID, { data: userData.data });
                }

                const userMoney = userData.money || 0;
                const investments = userData.data.investments || {};
                const history = userData.data.investHistory || [];
                const stopLossOrders = userData.data.stopLossOrders || {};

                const createBar = (current, max, length = 10) => {
                        const filled = Math.round((current / max) * length);
                        return "▰".repeat(filled) + "▱".repeat(length - filled);
                };

                const saveInvestmentData = async (updates) => {
                        const currentData = await usersData.get(senderID);
                        const newData = { ...currentData.data, ...updates };
                        await usersData.set(senderID, { data: newData });
                };

                const checkStopLoss = async () => {
                        let triggered = [];
                        let totalProceeds = 0;
                        
                        for (const [symbol, stopPrice] of Object.entries(stopLossOrders)) {
                                const asset = getCurrentPrice(symbol, investmentTypes);
                                if (asset && asset.price <= stopPrice && investments[symbol]) {
                                        const inv = investments[symbol];
                                        const totalValue = Math.round(asset.price * inv.amount * 100) / 100;
                                        const costBasis = Math.round(inv.avgPrice * inv.amount * 100) / 100;
                                        const profit = totalValue - costBasis;

                                        totalProceeds += totalValue;

                                        history.unshift({
                                                type: "STOP-LOSS SELL",
                                                symbol,
                                                amount: inv.amount,
                                                price: asset.price,
                                                total: totalValue,
                                                profit,
                                                date: moment().format("DD/MM HH:mm")
                                        });

                                        delete investments[symbol];
                                        delete stopLossOrders[symbol];
                                        
                                        triggered.push({ symbol, amount: inv.amount, price: asset.price, profit });
                                }
                        }
                        
                        if (triggered.length > 0) {
                                const freshData = await usersData.get(senderID);
                                const currentMoney = freshData.money || 0;
                                
                                await usersData.set(senderID, { money: currentMoney + totalProceeds });
                                await saveInvestmentData({ 
                                        investments, 
                                        stopLossOrders, 
                                        investHistory: history.slice(0, 20) 
                                });
                        }
                        
                        return triggered;
                };

                switch (action) {
                        case "market":
                        case "m": {
                                let msg = `╔════════════════════════════════════╗\n`;
                                msg += `║  ${getLang("marketTitle")}  ║\n`;
                                msg += `╚════════════════════════════════════╝\n\n`;

                                msg += "📊 𝐒𝐓𝐎𝐂𝐊𝐒:\n";
                                for (const [symbol, data] of Object.entries(investmentTypes.stocks)) {
                                        const current = getCurrentPrice(symbol, investmentTypes);
                                        const arrow = current.change >= 0 ? "📈" : "📉";
                                        const changeStr = current.change >= 0 ? `+${current.change.toFixed(2)}` : current.change.toFixed(2);
                                        msg += `${data.emoji} ${symbol}: $${current.price} ${arrow} ${changeStr}%\n`;
                                }

                                msg += "\n₿ 𝐂𝐑𝐘𝐏𝐓𝐎:\n";
                                for (const [symbol, data] of Object.entries(investmentTypes.crypto)) {
                                        const current = getCurrentPrice(symbol, investmentTypes);
                                        const arrow = current.change >= 0 ? "📈" : "📉";
                                        const changeStr = current.change >= 0 ? `+${current.change.toFixed(2)}` : current.change.toFixed(2);
                                        msg += `${data.emoji} ${symbol}: $${current.price} ${arrow} ${changeStr}%\n`;
                                }

                                msg += "\n🏆 𝐏𝐑𝐄𝐂𝐈𝐎𝐔𝐒 𝐌𝐄𝐓𝐀𝐋𝐒:\n";
                                for (const [symbol, data] of Object.entries(investmentTypes.metals)) {
                                        const current = getCurrentPrice(symbol, investmentTypes);
                                        const arrow = current.change >= 0 ? "📈" : "📉";
                                        const changeStr = current.change >= 0 ? `+${current.change.toFixed(2)}` : current.change.toFixed(2);
                                        msg += `${data.emoji} ${symbol}: $${current.price}/oz ${arrow} ${changeStr}%\n`;
                                }

                                msg += `\n💖 𝐔𝐬𝐞 '𝐢𝐧𝐯𝐞𝐬𝐭 𝐛𝐮𝐲 <𝐬𝐲𝐦𝐛𝐨𝐥> <𝐚𝐦𝐨𝐮𝐧𝐭>' 𝐭𝐨 𝐢𝐧𝐯𝐞𝐬𝐭`;
                                message.reply(msg);
                                break;
                        }

                        case "buy":
                        case "b": {
                                const symbol = args[1]?.toUpperCase();
                                const amount = parseFloat(args[2]);

                                if (!symbol || !amount || amount <= 0 || isNaN(amount)) {
                                        return message.reply(getLang("invalidAmount"));
                                }

                                const asset = getCurrentPrice(symbol, investmentTypes);
                                if (!asset) {
                                        return message.reply(getLang("invalidSymbol"));
                                }

                                const totalCost = Math.round(asset.price * amount * 100) / 100;

                                const freshData = await usersData.get(senderID);
                                const currentMoney = freshData.money || 0;
                                
                                if (totalCost > currentMoney) {
                                        return message.reply(getLang("insufficientFunds", totalCost.toFixed(2), currentMoney.toFixed(2)));
                                }

                                await usersData.set(senderID, { money: currentMoney - totalCost });

                                if (!investments[symbol]) {
                                        investments[symbol] = { amount: 0, avgPrice: 0, category: asset.category };
                                }

                                const inv = investments[symbol];
                                const newAmount = inv.amount + amount;
                                const newAvgPrice = ((inv.amount * inv.avgPrice) + (amount * asset.price)) / newAmount;

                                investments[symbol] = {
                                        amount: newAmount,
                                        avgPrice: Math.round(newAvgPrice * 100) / 100,
                                        category: asset.category
                                };

                                history.unshift({
                                        type: "BUY",
                                        symbol,
                                        amount,
                                        price: asset.price,
                                        total: totalCost,
                                        date: moment().format("DD/MM HH:mm")
                                });

                                await saveInvestmentData({ 
                                        investments, 
                                        investHistory: history.slice(0, 20) 
                                });

                                const msg = `╔════════════════════════════════════╗
║         ✅ 𝐁𝐔𝐘 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋         ║
╚════════════════════════════════════╝

${asset.emoji} ${symbol} - ${asset.name}
📦 Amount: ${amount}
💰 Price: $${asset.price}
💵 Total: $${totalCost.toFixed(2)}
💳 Remaining: $${(currentMoney - totalCost).toFixed(2)}

💖 Happy investing with Shizuka!`;

                                message.reply(msg);
                                break;
                        }

                        case "sell":
                        case "s": {
                                const symbol = args[1]?.toUpperCase();
                                const amount = parseFloat(args[2]);

                                if (!symbol || !amount || amount <= 0 || isNaN(amount)) {
                                        return message.reply(getLang("invalidAmount"));
                                }

                                const asset = getCurrentPrice(symbol, investmentTypes);
                                if (!asset) {
                                        return message.reply(getLang("invalidSymbol"));
                                }

                                const inv = investments[symbol];
                                if (!inv || inv.amount < amount) {
                                        return message.reply(getLang("insufficientShares", symbol, inv?.amount || 0));
                                }

                                const totalValue = Math.round(asset.price * amount * 100) / 100;
                                const costBasis = Math.round(inv.avgPrice * amount * 100) / 100;
                                const profit = totalValue - costBasis;
                                const profitPercent = ((profit / costBasis) * 100).toFixed(2);

                                const freshData = await usersData.get(senderID);
                                const currentMoney = freshData.money || 0;

                                await usersData.set(senderID, { money: currentMoney + totalValue });

                                inv.amount -= amount;
                                if (inv.amount <= 0) {
                                        delete investments[symbol];
                                        if (stopLossOrders[symbol]) delete stopLossOrders[symbol];
                                }

                                history.unshift({
                                        type: "SELL",
                                        symbol,
                                        amount,
                                        price: asset.price,
                                        total: totalValue,
                                        profit,
                                        date: moment().format("DD/MM HH:mm")
                                });

                                await saveInvestmentData({ 
                                        investments, 
                                        stopLossOrders,
                                        investHistory: history.slice(0, 20) 
                                });

                                const profitEmoji = profit >= 0 ? "📈" : "📉";
                                const profitText = profit >= 0 ? "Profit" : "Loss";

                                const msg = `╔════════════════════════════════════╗
║        ✅ 𝐒𝐄𝐋𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋        ║
╚════════════════════════════════════╝

${asset.emoji} ${symbol} - ${asset.name}
📦 Amount: ${amount}
💰 Price: $${asset.price}
💵 Total: $${totalValue.toFixed(2)}
${profitEmoji} ${profitText}: $${profit.toFixed(2)} (${profitPercent}%)
💳 New Balance: $${(currentMoney + totalValue).toFixed(2)}

💖 Great trade with Shizuka!`;

                                message.reply(msg);
                                break;
                        }

                        case "portfolio":
                        case "port":
                        case "p": {
                                const triggered = await checkStopLoss();
                                
                                let msg = `╔════════════════════════════════════╗\n`;
                                msg += `║     ${getLang("portfolioTitle")}     ║\n`;
                                msg += `╚════════════════════════════════════╝\n\n`;

                                const currentInvestments = (await usersData.get(senderID)).data.investments || {};

                                if (!currentInvestments || Object.keys(currentInvestments).length === 0) {
                                        msg += getLang("noInvestments");
                                        msg += "\n\n💡 Use 'invest market' to start investing!";
                                } else {
                                        let totalValue = 0;
                                        let totalCost = 0;

                                        for (const [symbol, inv] of Object.entries(currentInvestments)) {
                                                const asset = getCurrentPrice(symbol, investmentTypes);
                                                if (!asset) continue;

                                                const currentValue = asset.price * inv.amount;
                                                const cost = inv.avgPrice * inv.amount;
                                                const profit = currentValue - cost;
                                                const profitPercent = cost > 0 ? ((profit / cost) * 100).toFixed(2) : "0.00";

                                                totalValue += currentValue;
                                                totalCost += cost;

                                                const profitEmoji = profit >= 0 ? "💚" : "💔";
                                                const bar = createBar(Math.abs(profit), Math.max(Math.abs(profit), cost / 10));
                                                const stopLossInfo = stopLossOrders[symbol] ? `\n  🛑 Stop-Loss: $${stopLossOrders[symbol]}` : '';

                                                msg += `${asset.emoji} ${symbol} (${inv.amount} shares)\n`;
                                                msg += `  💰 Value: $${currentValue.toFixed(2)}\n`;
                                                msg += `  📊 ${profitEmoji} ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (${profitPercent}%)${stopLossInfo}\n`;
                                                msg += `  ${bar}\n\n`;
                                        }

                                        const totalProfit = totalValue - totalCost;
                                        const totalProfitPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(2) : "0.00";

                                        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                                        msg += `${getLang("totalValue", totalValue.toFixed(2))}\n`;
                                        msg += `${getLang("totalProfit", totalProfit.toFixed(2), totalProfitPercent)}\n`;
                                        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                                }

                                if (triggered.length > 0) {
                                        msg += `\n\n🛑 Stop-Loss Triggered:\n`;
                                        triggered.forEach(t => {
                                                msg += `• ${t.symbol}: Sold ${t.amount} @ $${t.price} (${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)})\n`;
                                        });
                                }

                                msg += `\n\n💖 Managed by Shizuka`;
                                message.reply(msg);
                                break;
                        }

                        case "price": {
                                const symbol = args[1]?.toUpperCase();
                                if (!symbol) {
                                        return message.reply(getLang("invalidSymbol"));
                                }

                                const asset = getCurrentPrice(symbol, investmentTypes);
                                if (!asset) {
                                        return message.reply(getLang("invalidSymbol"));
                                }

                                const arrow = asset.change >= 0 ? "📈" : "📉";
                                const changeStr = asset.change >= 0 ? `+${asset.change.toFixed(2)}` : asset.change.toFixed(2);

                                const msg = `╔════════════════════════════════════╗
║           💰 PRICE INFO 💰          ║
╚════════════════════════════════════╝

${asset.emoji} ${symbol} - ${asset.name}

💵 Current Price: $${asset.price}
${arrow} Change: ${changeStr}%
📊 Category: ${asset.category}
📉 Volatility: ${(asset.volatility * 100).toFixed(1)}%

💖 Powered by Shizuka`;

                                message.reply(msg);
                                break;
                        }

                        case "history":
                        case "h": {
                                let msg = `╔════════════════════════════════════╗\n`;
                                msg += `║    ${getLang("historyTitle")}    ║\n`;
                                msg += `╚════════════════════════════════════╝\n\n`;

                                if (history.length === 0) {
                                        msg += getLang("noHistory");
                                } else {
                                        history.slice(0, 10).forEach((tx, i) => {
                                                const icon = tx.type.includes("BUY") ? "🛒" : "💸";
                                                const profitInfo = tx.profit !== undefined 
                                                        ? `\n  📊 ${tx.profit >= 0 ? 'Profit' : 'Loss'}: ${tx.profit >= 0 ? '+' : ''}$${tx.profit.toFixed(2)}`
                                                        : '';

                                                msg += `${i + 1}. ${icon} ${tx.type} ${tx.symbol}\n`;
                                                msg += `  📦 ${tx.amount} @ $${tx.price}\n`;
                                                msg += `  💰 Total: $${tx.total.toFixed(2)}${profitInfo}\n`;
                                                msg += `  🕐 ${tx.date}\n\n`;
                                        });
                                }

                                msg += `💖 Tracked by Shizuka`;
                                message.reply(msg);
                                break;
                        }

                        case "stoploss":
                        case "sl": {
                                const symbol = args[1]?.toUpperCase();
                                const stopPrice = parseFloat(args[2]);

                                if (!symbol || !stopPrice || stopPrice <= 0 || isNaN(stopPrice)) {
                                        return message.reply("❌ Usage: invest stoploss <SYMBOL> <PRICE>\nExample: invest stoploss BTC 60000");
                                }

                                if (!investments[symbol]) {
                                        return message.reply(`❌ You don't own any ${symbol}! Buy some first.`);
                                }

                                const asset = getCurrentPrice(symbol, investmentTypes);
                                if (stopPrice >= asset.price) {
                                        return message.reply(`❌ Stop-loss price must be below current price ($${asset.price})`);
                                }

                                stopLossOrders[symbol] = stopPrice;
                                await saveInvestmentData({ stopLossOrders });

                                message.reply(`✅ Stop-loss order set for ${symbol} at $${stopPrice}
🔔 Your ${investments[symbol].amount} shares will auto-sell if price drops to $${stopPrice}`);
                                break;
                        }

                        case "trends":
                        case "t": {
                                let msg = `╔════════════════════════════════════╗
║        📊 MARKET TRENDS 📊         ║
╚════════════════════════════════════╝

`;
                                let allAssets = [];
                                for (const [category, assets] of Object.entries(investmentTypes)) {
                                        for (const [symbol, data] of Object.entries(assets)) {
                                                const current = getCurrentPrice(symbol, investmentTypes);
                                                allAssets.push({ ...current, symbol });
                                        }
                                }

                                allAssets.sort((a, b) => b.change - a.change);

                                msg += "🔥 TOP GAINERS:\n";
                                allAssets.slice(0, 3).forEach((asset, i) => {
                                        msg += `${i + 1}. ${asset.emoji} ${asset.symbol}: +${asset.change.toFixed(2)}%\n`;
                                });

                                msg += "\n❄️ TOP LOSERS:\n";
                                allAssets.slice(-3).reverse().forEach((asset, i) => {
                                        msg += `${i + 1}. ${asset.emoji} ${asset.symbol}: ${asset.change.toFixed(2)}%\n`;
                                });

                                msg += "\n💡 Tip: Buy low, sell high! 💖";
                                message.reply(msg);
                                break;
                        }

                        case "leaderboard":
                        case "lb": {
                                try {
                                        const allUsers = global.db.allUserData || [];
                                        let investors = [];

                                        for (const user of allUsers) {
                                                if (user.data && user.data.investments && Object.keys(user.data.investments).length > 0) {
                                                        let totalValue = 0;
                                                        let totalCost = 0;

                                                        for (const [symbol, inv] of Object.entries(user.data.investments)) {
                                                                const asset = getCurrentPrice(symbol, investmentTypes);
                                                                if (asset) {
                                                                        totalValue += asset.price * inv.amount;
                                                                        totalCost += inv.avgPrice * inv.amount;
                                                                }
                                                        }

                                                        const profit = totalValue - totalCost;
                                                        investors.push({
                                                                name: user.name || "Unknown",
                                                                userID: user.userID,
                                                                totalValue,
                                                                profit,
                                                                profitPercent: totalCost > 0 ? ((profit / totalCost) * 100).toFixed(2) : 0
                                                        });
                                                }
                                        }

                                        investors.sort((a, b) => b.profit - a.profit);

                                        let msg = `╔════════════════════════════════════╗
║      🏆 TOP INVESTORS 🏆          ║
╚════════════════════════════════════╝

`;

                                        if (investors.length === 0) {
                                                msg += "📋 No investors yet!\nBe the first to invest!";
                                        } else {
                                                investors.slice(0, 10).forEach((inv, i) => {
                                                        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                                                        const profitColor = inv.profit >= 0 ? "💚" : "💔";
                                                        msg += `${medal} ${inv.name}\n`;
                                                        msg += `   💰 Portfolio: $${inv.totalValue.toFixed(2)}\n`;
                                                        msg += `   ${profitColor} P/L: ${inv.profit >= 0 ? '+' : ''}$${inv.profit.toFixed(2)} (${inv.profitPercent}%)\n\n`;
                                                });
                                        }

                                        msg += "💖 Compete with the best!";
                                        message.reply(msg);
                                } catch (error) {
                                        message.reply("❌ Error loading leaderboard. Try again later!");
                                }
                                break;
                        }

                        default: {
                                let msg = `╔════════════════════════════════════╗
║    💰 SHIZUKA'S INVESTMENT 💰      ║
╚════════════════════════════════════╝

📋 𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬:

📊 invest market - View all prices
🛒 invest buy <symbol> <amount> - Buy
💸 invest sell <symbol> <amount> - Sell
💼 invest portfolio - Your investments
💰 invest price <symbol> - Check price
📜 invest history - Transaction log
🛑 invest stoploss <symbol> <price> - Stop-loss
📈 invest trends - Market trends
🏆 invest leaderboard - Top investors

💡 𝐄𝐱𝐚𝐦𝐩𝐥𝐞:
• invest buy BTC 0.5
• invest sell AAPL 10
• invest stoploss BTC 60000
• invest portfolio

💖 Happy investing with Shizuka!`;

                                message.reply(msg);
                                break;
                        }
                }
        }
};
