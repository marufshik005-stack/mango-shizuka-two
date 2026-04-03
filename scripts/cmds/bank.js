const moment = require("moment-timezone");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

async function renderTxnReceipt({
	type, // "Deposit" | "Withdrawal"
	amount,
	bankBalance,
	userName,
	userID
}) {
	const W = 1200, H = 700;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");

	// Background image
	try {
		const bg = await loadImage("https://i.postimg.cc/ryHfwpLJ/ezgif-22bfaf4827830f.jpg");
		ctx.drawImage(bg, 0, 0, W, H);
	}
	catch (e) {
		ctx.fillStyle = "#ffd6e7";
		ctx.fillRect(0, 0, W, H);
	}
	// Soft overlay
	ctx.fillStyle = "rgba(255, 214, 231, 0.85)";
	ctx.fillRect(0, 0, W, H);

	// Paper card
	const cardX = 60, cardY = 40, cardW = W - 120, cardH = H - 80, radius = 22;
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.15)";
	ctx.shadowBlur = 20;
	ctx.shadowOffsetY = 10;
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.moveTo(cardX + radius, cardY);
	ctx.lineTo(cardX + cardW - radius, cardY);
	ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
	ctx.lineTo(cardX + cardW, cardY + cardH - radius);
	ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
	ctx.lineTo(cardX + radius, cardY + cardH);
	ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
	ctx.lineTo(cardX, cardY + radius);
	ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
	ctx.fill();
	ctx.restore();

	// Border
	ctx.strokeStyle = "#e9e3e6";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(cardX + radius, cardY);
	ctx.lineTo(cardX + cardW - radius, cardY);
	ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
	ctx.lineTo(cardX + cardW, cardY + cardH - radius);
	ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
	ctx.lineTo(cardX + radius, cardY + cardH);
	ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
	ctx.lineTo(cardX, cardY + radius);
	ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
	ctx.stroke();

	// Watermark
	try {
		const mark = await loadImage("https://i.postimg.cc/288zFmcg/shizuka-photo-5233.jpg");
		ctx.save();
		ctx.globalAlpha = 0.08;
		const mw = cardW * 0.55;
		const mh = mw * (mark.height / mark.width);
		const mx = cardX + (cardW - mw) / 2;
		const my = cardY + (cardH - mh) / 2;
		ctx.drawImage(mark, mx, my, mw, mh);
		ctx.restore();
	} catch (e) {}

	// Header ribbon
	ctx.fillStyle = "#ff3f93";
	ctx.fillRect(cardX, cardY + 18, cardW, 56);
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 34px Arial";
	ctx.textAlign = "left";
	ctx.fillText("Shizuka Bank", cardX + 32, cardY + 56);
	ctx.textAlign = "right";
	ctx.font = "18px Arial";
	ctx.fillText(moment().format("YYYY-MM-DD HH:mm:ss"), cardX + cardW - 20, cardY + 54);

	// Title
	ctx.textAlign = "center";
	ctx.fillStyle = "#ff3f93";
	ctx.font = "bold 40px Arial";
	ctx.fillText(`${type} Receipt`, cardX + cardW / 2, cardY + 130);

	// Details
	const fmt = n => n.toLocaleString("en-US");
	ctx.textAlign = "left";
	ctx.fillStyle = "#111";
	ctx.font = "bold 26px Arial";
	const sx = cardX + 60, sy = cardY + 190, lh = 48;
	ctx.fillText("Account Holder", sx, sy);
	ctx.fillText("Account ID", sx, sy + lh);
	ctx.fillText("Amount", sx, sy + lh * 2);
	ctx.fillText("Bank Balance", sx, sy + lh * 3);

	ctx.textAlign = "right";
	ctx.fillStyle = "#444";
	ctx.font = "24px Arial";
	ctx.fillText(userName, cardX + cardW - 60, sy);
	ctx.fillText(String(userID), cardX + cardW - 60, sy + lh);
	ctx.fillStyle = type === "Deposit" ? "#1a9b34" : "#c03535";
	ctx.font = "bold 30px Arial";
	ctx.fillText(`$${fmt(amount)}`, cardX + cardW - 60, sy + lh * 2);
	ctx.fillStyle = "#444";
	ctx.font = "24px Arial";
	ctx.fillText(`$${fmt(bankBalance)}`, cardX + cardW - 60, sy + lh * 3);

	// QR
	try {
		const id = "SB-" + Date.now().toString(36).toUpperCase().slice(-8);
		const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(type+"|UID:"+userID+"|ID:"+id)}`;
		const qr = await loadImage(qrUrl);
		ctx.drawImage(qr, cardX + 60, cardY + cardH - 180, 120, 120);
	} catch (e) {}

	// Stamp
	ctx.beginPath();
	ctx.arc(cardX + cardW - 140, cardY + cardH - 120, 34, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(255,63,147,0.15)";
	ctx.fill();
	ctx.strokeStyle = "#ff3f93";
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = "#ff3f93";
	ctx.font = "bold 16px Arial";
	ctx.textAlign = "center";
	ctx.fillText("SHIZUKA", cardX + cardW - 140, cardY + cardH - 116);

	return canvas.toBuffer("image/png");
}

module.exports = {
	config: {
		name: "bank",
		aliases: ["b"],
		version: "1.0",
		author: "𝐙ɪsᴀɴ",
		countDown: 5,
		role: 0,
		description: {
			vi: "Quản lý tài khoản ngân hàng - gửi tiền, rút tiền, chuyển khoản",
			en: "Manage bank account - deposit, withdraw, transfer money"
		},
		category: "economy",
		guide: {
			vi: "   {pn} deposit <số tiền>: Gửi tiền vào ngân hàng"
				+ "\n   {pn} withdraw <số tiền>: Rút tiền từ ngân hàng"
				+ "\n   {pn} balance: Xem số dư ngân hàng"
				+ "\n   {pn} transfer <@tag> <số tiền>: Chuyển tiền cho người khác"
				+ "\n   {pn} history: Xem lịch sử giao dịch",
			en: "   {pn} deposit <amount>: Deposit money to bank"
				+ "\n   {pn} withdraw <amount>: Withdraw money from bank"
				+ "\n   {pn} balance: View bank balance"
				+ "\n   {pn} transfer <@tag> <amount>: Transfer money to someone"
				+ "\n   {pn} history: View transaction history"
		}
	},

	langs: {
		vi: {
			depositSuccess: "✅ Đã gửi %1$ vào ngân hàng thành công!",
			withdrawSuccess: "✅ Đã rút %1$ từ ngân hàng thành công!",
			transferSuccess: "✅ Đã chuyển %1$ cho %2 thành công!",
			transferReceived: "💰 Bạn đã nhận được %1$ từ %2!",
			insufficientFunds: "❌ Không đủ tiền! Bạn chỉ có %1$",
			insufficientBankFunds: "❌ Không đủ tiền trong ngân hàng! Bạn chỉ có %1$ trong ngân hàng",
			invalidAmount: "❌ Số tiền không hợp lệ!",
			bankBalance: "🏦 Số dư ngân hàng: %1$",
			walletBalance: "💳 Số dư ví: %1$",
			noTransactions: "📋 Chưa có giao dịch nào",
			transactionHistory: "📋 Lịch sử giao dịch gần đây:",
			transactionItem: "• %1 - %2$ (%3)",
			missingAmount: "❌ Vui lòng nhập số tiền!",
			missingTarget: "❌ Vui lòng tag người muốn chuyển tiền!",
			cannotTransferSelf: "❌ Không thể chuyển tiền cho chính mình!",
			userNotFound: "❌ Không tìm thấy người dùng!",
			bankInterest: "💰 Lãi suất ngân hàng: %1$ (hàng ngày lúc 00:00)",
			bankLevel: "🏦 Cấp độ ngân hàng: %1",
			nextLevel: "📈 Cấp tiếp theo: %1$ cần thiết"
		},
		en: {
			depositSuccess: "✅ Successfully deposited %1$ to bank!",
			withdrawSuccess: "✅ Successfully withdrew %1$ from bank!",
			transferSuccess: "✅ Successfully transferred %1$ to %2!",
			transferReceived: "💰 You received %1$ from %2!",
			insufficientFunds: "❌ Insufficient funds! You only have %1$",
			insufficientBankFunds: "❌ Insufficient bank funds! You only have %1$ in bank",
			invalidAmount: "❌ Invalid amount!",
			bankBalance: "🏦 Bank Balance: %1$",
			walletBalance: "💳 Wallet Balance: %1$",
			noTransactions: "📋 No transactions yet",
			transactionHistory: "📋 Recent transaction history:",
			transactionItem: "• %1 - %2$ (%3)",
			missingAmount: "❌ Please enter amount!",
			missingTarget: "❌ Please tag the person to transfer money to!",
			cannotTransferSelf: "❌ Cannot transfer money to yourself!",
			userNotFound: "❌ User not found!",
			bankInterest: "💰 Bank interest: %1$ (daily at 00:00)",
			bankLevel: "🏦 Bank Level: %1",
			nextLevel: "📈 Next level: %1$ required"
		}
	},

	onStart: async function ({ message, args, event, usersData, getLang, api }) {
		const { senderID } = event;
		const action = args[0]?.toLowerCase();

		// Get or create economy data (persisted under data.economy)
		let economyData = await usersData.get(senderID, "data.economy");
		if (!economyData) {
			economyData = {
				bankBalance: 0,
				investments: {},
				transactions: [],
				lastDailyReward: "",
				bankLevel: 1,
				investmentLevel: 1
			};
			await usersData.set(senderID, economyData, "data.economy");
		}

		const userMoney = await usersData.get(senderID, "money");

		switch (action) {
			case "deposit":
			case "d": {
				const amount = parseInt(args[1]);
				if (!amount || amount <= 0) {
					return message.reply(getLang("invalidAmount"));
				}
				if (amount > userMoney) {
					return message.reply(getLang("insufficientFunds", userMoney));
				}

				// Update balances
				await usersData.set(senderID, { money: userMoney - amount });
				await usersData.set(senderID, economyData.bankBalance + amount, "data.economy.bankBalance");

				// Add transaction
				const depositTransaction = {
					type: "deposit",
					amount: amount,
					description: "Bank Deposit",
					date: moment().format("DD/MM/YYYY HH:mm:ss"),
					relatedUser: null
				};
				economyData.transactions.unshift(depositTransaction);
				if (economyData.transactions.length > 20) economyData.transactions.pop();
				await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

				// Render and send deposit receipt image
				try {
					const holderName = await usersData.getName(senderID) || senderID;
					const buf = await renderTxnReceipt({
						type: "Deposit",
						amount,
						bankBalance: economyData.bankBalance + amount,
						userName: holderName,
						userID: senderID
					});
					const outPath = path.join(__dirname, "cache", `bank_txn_${senderID}_deposit.png`);
					await fs.ensureDir(path.dirname(outPath));
					await fs.writeFile(outPath, buf);
					await message.reply({ attachment: fs.createReadStream(outPath), body: getLang("depositSuccess", amount) });
					try { await fs.remove(outPath); } catch (e) {}
				}
				catch (e) {
					message.reply(getLang("depositSuccess", amount));
				}
				break;
			}

			case "withdraw":
			case "w": {
				const amount = parseInt(args[1]);
				if (!amount || amount <= 0) {
					return message.reply(getLang("invalidAmount"));
				}
				if (amount > economyData.bankBalance) {
					return message.reply(getLang("insufficientBankFunds", economyData.bankBalance));
				}

				// Update balances
				await usersData.set(senderID, { money: userMoney + amount });
				await usersData.set(senderID, economyData.bankBalance - amount, "data.economy.bankBalance");

				// Add transaction
				const withdrawTransaction = {
					type: "withdraw",
					amount: amount,
					description: "Bank Withdrawal",
					date: moment().format("DD/MM/YYYY HH:mm:ss"),
					relatedUser: null
				};
				economyData.transactions.unshift(withdrawTransaction);
				if (economyData.transactions.length > 20) economyData.transactions.pop();
				await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

				// Render and send withdrawal receipt image
				try {
					const holderName = await usersData.getName(senderID) || senderID;
					const buf = await renderTxnReceipt({
						type: "Withdrawal",
						amount,
						bankBalance: economyData.bankBalance - amount,
						userName: holderName,
						userID: senderID
					});
					const outPath = path.join(__dirname, "cache", `bank_txn_${senderID}_withdraw.png`);
					await fs.ensureDir(path.dirname(outPath));
					await fs.writeFile(outPath, buf);
					await message.reply({ attachment: fs.createReadStream(outPath), body: getLang("withdrawSuccess", amount) });
					try { await fs.remove(outPath); } catch (e) {}
				}
				catch (e) {
					message.reply(getLang("withdrawSuccess", amount));
				}
				break;
			}

			case "balance":
			case "b": {
				const bankBalance = economyData.bankBalance;
				const walletBalance = userMoney;
				const bankLevel = economyData.bankLevel;
				const nextLevelAmount = bankLevel * 10000;
				const dailyInterest = Math.floor(bankBalance * 0.01);

				// Create Shizuka-themed digital receipt image
				const W = 900, H = 1200;
				const canvas = createCanvas(W, H);
				const ctx = canvas.getContext("2d");

				// Background image (Shizuka themed)
				try {
					const bg = await loadImage("https://i.postimg.cc/ryHfwpLJ/ezgif-22bfaf4827830f.jpg");
					ctx.drawImage(bg, 0, 0, W, H);
				}
				catch (e) {
					// fallback to solid background if image fails
					ctx.fillStyle = "#ffd6e7";
					ctx.fillRect(0, 0, W, H);
				}
				// Soft pink overlay for theme consistency
				ctx.fillStyle = "rgba(255, 214, 231, 0.85)";
				ctx.fillRect(0, 0, W, H);
				// hearts pattern
				ctx.globalAlpha = 0.15;
				ctx.fillStyle = "#ff5ca8";
				for (let i = 0; i < 40; i++) {
					const x = Math.random() * W;
					const y = Math.random() * H;
					const r = 10 + Math.random() * 20;
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.bezierCurveTo(x - r, y - r, x - 2 * r, y + r, x, y + 2 * r);
					ctx.bezierCurveTo(x + 2 * r, y + r, x + r, y - r, x, y);
					ctx.fill();
				}
				ctx.globalAlpha = 1;

				// Receipt card with drop shadow
				const cardX = 60, cardY = 80, cardW = W - 120, cardH = H - 160, radius = 26;
				ctx.save();
				ctx.shadowColor = "rgba(0,0,0,0.15)";
				ctx.shadowBlur = 24;
				ctx.shadowOffsetY = 12;
				ctx.fillStyle = "#ffffff";
				ctx.beginPath();
				ctx.moveTo(cardX + radius, cardY);
				ctx.lineTo(cardX + cardW - radius, cardY);
				ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
				ctx.lineTo(cardX + cardW, cardY + cardH - radius);
				ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
				ctx.lineTo(cardX + radius, cardY + cardH);
				ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
				ctx.lineTo(cardX, cardY + radius);
				ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
				ctx.fill();
				ctx.restore();

				// Fine border for realism
				ctx.strokeStyle = "#e9e3e6";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(cardX + radius, cardY);
				ctx.lineTo(cardX + cardW - radius, cardY);
				ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
				ctx.lineTo(cardX + cardW, cardY + cardH - radius);
				ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
				ctx.lineTo(cardX + radius, cardY + cardH);
				ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
				ctx.lineTo(cardX, cardY + radius);
				ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
				ctx.stroke();

				// Watermark inside card (low opacity)
				try {
					const mark = await loadImage("https://i.postimg.cc/288zFmcg/shizuka-photo-5233.jpg");
					ctx.save();
					ctx.globalAlpha = 0.08;
					const mw = cardW * 0.6;
					const mh = mw * (mark.height / mark.width);
					const mx = cardX + (cardW - mw) / 2;
					const my = cardY + (cardH - mh) / 2;
					ctx.drawImage(mark, mx, my, mw, mh);
					ctx.restore();
				}
				catch (e) {}

				// Header ribbon
				ctx.fillStyle = "#ff3f93";
				ctx.fillRect(cardX, cardY + 24, cardW, 64);
				ctx.fillStyle = "#ffffff";
				ctx.font = "bold 40px Arial";
				ctx.textAlign = "left";
				ctx.fillText("Shizuka Bank", cardX + 36, cardY + 68);
				ctx.textAlign = "right";
				ctx.font = "20px Arial";
				ctx.fillText(moment().format("YYYY-MM-DD HH:mm:ss"), cardX + cardW - 24, cardY + 66);

				// Receipt meta (ID, Branch)
				const receiptId = "SB-" + Date.now().toString(36).toUpperCase().slice(-8);
				const branch = "Branch: Tokyo-01";
				ctx.textAlign = "left";
				ctx.fillStyle = "#999";
				ctx.font = "18px Arial";
				ctx.fillText(`Receipt: ${receiptId}`, cardX + 36, cardY + 120);
				ctx.fillText(branch, cardX + 36, cardY + 144);

				// Optional photo (use replied image if exists)
				try {
					const replyAttach = event.messageReply?.attachments?.[0];
					const url = replyAttach?.url;
					if (url) {
						const img = await loadImage(url);
						const imgSize = 260;
						ctx.save();
						ctx.beginPath();
						ctx.arc(W / 2, cardY + 260, imgSize / 2, 0, Math.PI * 2);
						ctx.closePath();
						ctx.clip();
						ctx.drawImage(img, W / 2 - imgSize / 2, cardY + 260 - imgSize / 2, imgSize, imgSize);
						ctx.restore();
					}
				}
				catch (e) { }

				// Perforation line
				ctx.setLineDash([10, 10]);
				ctx.strokeStyle = "#ead1dd";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(cardX + 24, cardY + 170);
				ctx.lineTo(cardX + cardW - 24, cardY + 170);
				ctx.stroke();
				ctx.setLineDash([]);

				// Info lines
				const startY = cardY + 360;
				const lineH = 52;
				ctx.textAlign = "left";
				ctx.fillStyle = "#111";
				ctx.font = "bold 28px Arial";
				ctx.fillText("Account Holder", cardX + 60, startY);
				ctx.fillText("Account ID", cardX + 60, startY + lineH);
				ctx.fillText("Bank Balance", cardX + 60, startY + lineH * 2);
				ctx.fillText("Bank Level", cardX + 60, startY + lineH * 3);
				ctx.fillText("Next Level Need", cardX + 60, startY + lineH * 4);
				ctx.fillText("Daily Interest", cardX + 60, startY + lineH * 5);

				ctx.textAlign = "right";
				ctx.fillStyle = "#444";
				ctx.font = "24px Arial";
				const holderName = await usersData.getName(senderID) || senderID;
				ctx.fillText(holderName, cardX + cardW - 60, startY);
				ctx.fillText(String(senderID), cardX + cardW - 60, startY + lineH);
				const fmt = n => n.toLocaleString("en-US");
				ctx.fillText(`$${fmt(bankBalance)}`, cardX + cardW - 60, startY + lineH * 2);
				ctx.fillText(`#${bankLevel}`, cardX + cardW - 60, startY + lineH * 3);
				ctx.fillText(`$${fmt(nextLevelAmount)}`, cardX + cardW - 60, startY + lineH * 4);
				ctx.fillText(`$${fmt(dailyInterest)}`, cardX + cardW - 60, startY + lineH * 5);

				// Signature line for realism
				ctx.textAlign = "left";
				ctx.strokeStyle = "#e5d7dc";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(cardX + 60, cardY + cardH - 170);
				ctx.lineTo(cardX + 300, cardY + cardH - 170);
				ctx.stroke();
				ctx.fillStyle = "#a38b95";
				ctx.font = "16px Arial";
				ctx.fillText("Authorized Signature", cardX + 60, cardY + cardH - 148);

				// QR code (account)
				try {
					const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent("UID:" + senderID + "|REC:" + receiptId)}`;
					const qr = await loadImage(qrUrl);
					ctx.drawImage(qr, cardX + cardW - 60 - 140, cardY + 190, 140, 140);
				} catch (e) {}

				// Barcode simulation
				const barY = cardY + cardH - 120;
				let x = cardX + 60;
				for (let i = 0; i < 80; i++) {
					const w = Math.random() > 0.5 ? 3 : 1;
					const h = 60 + Math.random() * 20;
					ctx.fillStyle = i % 2 === 0 ? "#333" : "#777";
					ctx.fillRect(x, barY + (80 - h), w, h);
					x += w + 2;
				}

				// Stamp
				ctx.beginPath();
				ctx.arc(cardX + 140, barY + 40, 34, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(255,63,147,0.15)";
				ctx.fill();
				ctx.strokeStyle = "#ff3f93";
				ctx.lineWidth = 3;
				ctx.stroke();
				ctx.fillStyle = "#ff3f93";
				ctx.font = "bold 16px Arial";
				ctx.textAlign = "center";
				ctx.fillText("SHIZUKA", cardX + 140, barY + 44);

				// Footer note
				ctx.textAlign = "center";
				ctx.fillStyle = "#ff3f93";
				ctx.font = "italic 22px Arial";
				ctx.fillText("Thank you for banking with Shizuka Bank", W / 2, cardY + cardH - 40);

				// Send attachment
				const outPath = path.join(__dirname, "cache", `bank_receipt_${senderID}.png`);
				await fs.ensureDir(path.dirname(outPath));
				await fs.writeFile(outPath, canvas.toBuffer("image/png"));
				await message.reply({ attachment: fs.createReadStream(outPath) });
				try { await fs.remove(outPath); } catch (e) {}

				break;
			}

			case "transfer":
			case "t": {
				if (!args[1] || !args[2]) {
					return message.reply(getLang("missingTarget"));
				}

				const amount = parseInt(args[2]);
				if (!amount || amount <= 0) {
					return message.reply(getLang("invalidAmount"));
				}

				if (amount > userMoney) {
					return message.reply(getLang("insufficientFunds", userMoney));
				}

				// Get target user
				const targetID = Object.keys(event.mentions)[0];
				if (!targetID) {
					return message.reply(getLang("userNotFound"));
				}

				if (targetID === senderID) {
					return message.reply(getLang("cannotTransferSelf"));
				}

				// Get target user data
				const targetUserData = await usersData.get(targetID);
				if (!targetUserData) {
					return message.reply(getLang("userNotFound"));
				}

				// Update sender balance
				await usersData.set(senderID, {
					money: userMoney - amount
				});

				// Update receiver balance
				await usersData.set(targetID, {
					money: targetUserData.money + amount
				});

				// Add transactions for both users
				const transferTransaction = {
					type: "transfer_sent",
					amount: amount,
					description: `Transfer to ${event.mentions[targetID]}`,
					date: moment().format("DD/MM/YYYY HH:mm:ss"),
					relatedUser: targetID
				};

				const receiveTransaction = {
					type: "transfer_received",
					amount: amount,
					description: `Received from ${event.senderName}`,
					date: moment().format("DD/MM/YYYY HH:mm:ss"),
					relatedUser: senderID
				};

				// Update sender transactions
				economyData.transactions.unshift(transferTransaction);
				if (economyData.transactions.length > 20) economyData.transactions.pop();
				await usersData.set(senderID, economyData.transactions, "data.economy.transactions");

				// Update receiver transactions
				let targetEconomyData = await usersData.get(targetID, "data.economy");
				if (!targetEconomyData) {
					targetEconomyData = {
						bankBalance: 0,
						investments: {},
						transactions: [],
						lastDailyReward: "",
						bankLevel: 1,
						investmentLevel: 1
					};
				}
				targetEconomyData.transactions.unshift(receiveTransaction);
				if (targetEconomyData.transactions.length > 20) targetEconomyData.transactions.pop();
				await usersData.set(targetID, targetEconomyData.transactions, "data.economy.transactions");

				message.reply(getLang("transferSuccess", amount, event.mentions[targetID]));
				break;
			}

			case "history":
			case "h": {
				if (!economyData.transactions || economyData.transactions.length === 0) {
					return message.reply(getLang("noTransactions"));
				}

				let msg = getLang("transactionHistory") + "\n\n";
				const recentTransactions = economyData.transactions.slice(0, 10);
				
				for (const transaction of recentTransactions) {
					const typeText = {
						deposit: "Deposit",
						withdraw: "Withdraw",
						transfer_sent: "Transfer Sent",
						transfer_received: "Transfer Received",
						investment: "Investment",
						dividend: "Dividend",
						daily_reward: "Daily Reward",
						bank_interest: "Bank Interest"
					}[transaction.type] || transaction.type;

					msg += getLang("transactionItem", 
						transaction.date, 
						transaction.amount, 
						typeText
					) + "\n";
				}

				message.reply(msg);
				break;
			}

			default: {
				const bankBalance = economyData.bankBalance;
				const walletBalance = userMoney;
				const bankLevel = economyData.bankLevel;

				let msg = "🏦 **BANK SYSTEM** 🏦\n\n";
				msg += getLang("bankBalance", bankBalance) + "\n";
				msg += getLang("walletBalance", walletBalance) + "\n";
				msg += getLang("bankLevel", bankLevel) + "\n\n";
				msg += "📋 **Available Commands:**\n";
				msg += "• `bank deposit <amount>` - Deposit money\n";
				msg += "• `bank withdraw <amount>` - Withdraw money\n";
				msg += "• `bank transfer <@tag> <amount>` - Transfer money\n";
				msg += "• `bank history` - View transactions\n";
				msg += "• `bank balance` - View balances";

				message.reply(msg);
				break;
			}
		}
	}
};
