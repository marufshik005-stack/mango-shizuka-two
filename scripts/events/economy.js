const moment = require("moment-timezone");
const cron = require("node-cron");

module.exports = {
	config: {
		name: "economyEvents",
		version: "1.0",
		author: "GoatBot"
	},

	onLoad: async function ({ usersData, globalData }) {
		// Daily bank interest at midnight
		cron.schedule("0 0 * * *", async () => {
			console.log("Running daily bank interest...");
			
			try {
				// Get all users with economy data
				const allUsers = await usersData.getAll();
				
				for (const user of allUsers) {
					if (user.economy && user.economy.bankBalance > 0) {
						const interest = Math.floor(user.economy.bankBalance * 0.01); // 1% daily interest
						
						if (interest > 0) {
							await usersData.set(user.userID, {
								"economy.bankBalance": user.economy.bankBalance + interest
							});

							// Add transaction
							const interestTransaction = {
								type: "bank_interest",
								amount: interest,
								description: "Daily Bank Interest",
								date: moment().format("DD/MM/YYYY HH:mm:ss"),
								relatedUser: null
							};

							if (!user.economy.transactions) user.economy.transactions = [];
							user.economy.transactions.unshift(interestTransaction);
							if (user.economy.transactions.length > 20) user.economy.transactions.pop();
							
							await usersData.set(user.userID, { "economy.transactions": user.economy.transactions });
						}
					}
				}
				
				console.log("Daily bank interest completed");
			} catch (error) {
				console.error("Error running daily bank interest:", error);
			}
		});

		// Market fluctuations every hour
		cron.schedule("0 * * * *", async () => {
			console.log("Running market fluctuations...");
			
			try {
				// Update global market data
				const marketData = await globalData.get("marketData") || {
					lastUpdate: Date.now(),
					volatility: 0.1
				};

				// Increase volatility during market hours (9 AM - 4 PM)
				const hour = new Date().getHours();
				if (hour >= 9 && hour <= 16) {
					marketData.volatility = Math.min(0.3, marketData.volatility + 0.01);
				} else {
					marketData.volatility = Math.max(0.05, marketData.volatility - 0.005);
				}

				marketData.lastUpdate = Date.now();
				await globalData.set("marketData", marketData);
				
				console.log("Market fluctuations updated");
			} catch (error) {
				console.error("Error running market fluctuations:", error);
			}
		});

		// Weekly market reset (Sundays at midnight)
		cron.schedule("0 0 * * 0", async () => {
			console.log("Running weekly market reset...");
			
			try {
				// Reset market volatility
				await globalData.set("marketData", {
					lastUpdate: Date.now(),
					volatility: 0.1
				});
				
				console.log("Weekly market reset completed");
			} catch (error) {
				console.error("Error running weekly market reset:", error);
			}
		});

		console.log("Economy events system loaded");
	},

	onMessage: async function ({ message, event, usersData, getLang }) {
		// Handle special economy events
		const { senderID } = event;
		
		// Random bonus events (1% chance per message)
		if (Math.random() < 0.01) {
			const bonusAmount = Math.floor(Math.random() * 50) + 10; // 10-60 random bonus
			
			await usersData.set(senderID, {
				money: (await usersData.get(senderID, "money")) + bonusAmount
			});

			// Add transaction
			const bonusTransaction = {
				type: "bonus",
				amount: bonusAmount,
				description: "Random Bonus Event",
				date: moment().format("DD/MM/YYYY HH:mm:ss"),
				relatedUser: null
			};

			let economyData = await usersData.get(senderID, "economy");
			if (!economyData) {
				economyData = {
					bankBalance: 0,
					investments: {},
					transactions: [],
					lastDailyReward: "",
					bankLevel: 1,
					investmentLevel: 1,
					workLevel: 1,
					workCount: 0,
					lastWorkTime: 0
				};
			}

			if (!economyData.transactions) economyData.transactions = [];
			economyData.transactions.unshift(bonusTransaction);
			if (economyData.transactions.length > 20) economyData.transactions.pop();
			
			await usersData.set(senderID, { "economy.transactions": economyData.transactions });

			message.reply(`🎉 **RANDOM BONUS!** You received ${bonusAmount}$!`);
		}
	}
};
