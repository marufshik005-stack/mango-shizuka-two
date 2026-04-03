const moment = require("moment-timezone");

module.exports = {
	config: {
		name: "shop",
		aliases: ["store", "buy"],
		version: "1.0",
		author: "GoatBot",
		countDown: 5,
		role: 0,
		description: {
			vi: "Cửa hàng - mua các vật phẩm và nâng cấp",
			en: "Shop - buy items and upgrades"
		},
		category: "economy",
		guide: {
			vi: "   {pn}: Xem cửa hàng\n   {pn} buy <tên vật phẩm>: Mua vật phẩm\n   {pn} inventory: Xem kho đồ",
			en: "   {pn}: View shop\n   {pn} buy <item name>: Buy item\n   {pn} inventory: View inventory"
		}
	},

	langs: {
		vi: {
			shopTitle: "🛒 **CỬA HÀNG** 🛒",
			itemCategory: "📦 **%1:**",
			itemInfo: "• %1 - %2$ (%3)",
			itemBought: "✅ Đã mua %1 thành công!",
			insufficientFunds: "❌ Không đủ tiền! Cần %1$, bạn có %2$",
			itemNotFound: "❌ Không tìm thấy vật phẩm!",
			alreadyOwned: "❌ Bạn đã sở hữu vật phẩm này!",
			invalidAmount: "❌ Số lượng không hợp lệ!",
			shopCategories: "📋 **DANH MỤC:**\n• `shop` - Xem tất cả\n• `shop upgrades` - Nâng cấp\n• `shop items` - Vật phẩm\n• `shop tools` - Công cụ",
			inventoryTitle: "🎒 **KHO ĐỒ** 🎒",
			inventoryItem: "• %1 x%2 (%3)",
			emptyInventory: "📦 Kho đồ trống!",
			itemUsed: "✅ Đã sử dụng %1!",
			itemNotOwned: "❌ Bạn không sở hữu vật phẩm này!",
			upgradeSuccess: "✅ Nâng cấp thành công!",
			upgradeMaxLevel: "❌ Đã đạt cấp độ tối đa!",
			upgradeInsufficientFunds: "❌ Không đủ tiền để nâng cấp!"
		},
		en: {
			shopTitle: "🛒 **SHOP** 🛒",
			itemCategory: "📦 **%1:**",
			itemInfo: "• %1 - %2$ (%3)",
			itemBought: "✅ Successfully bought %1!",
			insufficientFunds: "❌ Insufficient funds! Need %1$, you have %2$",
			itemNotFound: "❌ Item not found!",
			alreadyOwned: "❌ You already own this item!",
			invalidAmount: "❌ Invalid amount!",
			shopCategories: "📋 **CATEGORIES:**\n• `shop` - View all\n• `shop upgrades` - Upgrades\n• `shop items` - Items\n• `shop tools` - Tools",
			inventoryTitle: "🎒 **INVENTORY** 🎒",
			inventoryItem: "• %1 x%2 (%3)",
			emptyInventory: "📦 Inventory is empty!",
			itemUsed: "✅ Used %1!",
			itemNotOwned: "❌ You don't own this item!",
			upgradeSuccess: "✅ Upgrade successful!",
			upgradeMaxLevel: "❌ Already at maximum level!",
			upgradeInsufficientFunds: "❌ Insufficient funds for upgrade!"
		}
	},

	onStart: async function ({ message, args, event, usersData, getLang }) {
		const { senderID } = event;
		const action = args[0]?.toLowerCase();
		const itemName = args[1]?.toLowerCase();

		// Shop items
		const shopItems = {
			upgrades: {
				"bank_level": {
					name: "Bank Level Upgrade",
					price: 10000,
					description: "Increases bank interest rate",
					type: "upgrade",
					maxLevel: 10
				},
				"work_level": {
					name: "Work Level Upgrade", 
					price: 5000,
					description: "Increases work earnings",
					type: "upgrade",
					maxLevel: 10
				},
				"investment_level": {
					name: "Investment Level Upgrade",
					price: 15000,
					description: "Reduces investment fees",
					type: "upgrade",
					maxLevel: 10
				}
			},
			items: {
				"lucky_charm": {
					name: "Lucky Charm",
					price: 1000,
					description: "Increases casino win chance",
					type: "item",
					consumable: false
				},
				"work_boost": {
					name: "Work Boost",
					price: 500,
					description: "2x work earnings for 1 hour",
					type: "item",
					consumable: true
				},
				"investment_boost": {
					name: "Investment Boost",
					price: 2000,
					description: "Reduces investment volatility",
					type: "item",
					consumable: true
				},
				"money_bag": {
					name: "Money Bag",
					price: 100,
					description: "Small amount of money",
					type: "item",
					consumable: true
				}
			},
			tools: {
				"calculator": {
					name: "Calculator",
					price: 50,
					description: "Helps with math calculations",
					type: "tool",
					consumable: false
				},
				"market_analyzer": {
					name: "Market Analyzer",
					price: 2000,
					description: "Analyzes market trends",
					type: "tool",
					consumable: false
				},
				"lucky_dice": {
					name: "Lucky Dice",
					price: 500,
					description: "Increases dice game win chance",
					type: "tool",
					consumable: false
				}
			}
		};

		// Get user data
		const userMoney = await usersData.get(senderID, "money");
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
				lastWorkTime: 0,
				inventory: {},
				upgrades: {
					bank_level: 1,
					work_level: 1,
					investment_level: 1
				}
			};
			await usersData.set(senderID, { economy: economyData });
		}

		// Initialize inventory if not exists
		if (!economyData.inventory) {
			economyData.inventory = {};
		}

		switch (action) {
			case "buy": {
				if (!itemName) {
					return message.reply("❌ Please specify an item to buy!");
				}

				// Find item in shop
				let item = null;
				let category = null;
				for (const [cat, items] of Object.entries(shopItems)) {
					if (items[itemName]) {
						item = items[itemName];
						category = cat;
						break;
					}
				}

				if (!item) {
					return message.reply(getLang("itemNotFound"));
				}

				// Check if it's an upgrade
				if (item.type === "upgrade") {
					const currentLevel = economyData.upgrades?.[itemName] || 1;
					if (currentLevel >= item.maxLevel) {
						return message.reply(getLang("upgradeMaxLevel"));
					}

					const upgradePrice = item.price * currentLevel;
					if (upgradePrice > userMoney) {
						return message.reply(getLang("upgradeInsufficientFunds"));
					}

					// Buy upgrade
					await usersData.set(senderID, {
						money: userMoney - upgradePrice
					});

					// Update upgrade level
					if (!economyData.upgrades) economyData.upgrades = {};
					economyData.upgrades[itemName] = currentLevel + 1;
					await usersData.set(senderID, { "economy.upgrades": economyData.upgrades });

					message.reply(getLang("upgradeSuccess") + ` ${item.name} Level ${currentLevel + 1}!`);
				} else {
					// Check if already owned (for non-consumables)
					if (!item.consumable && economyData.inventory[itemName]) {
						return message.reply(getLang("alreadyOwned"));
					}

					if (item.price > userMoney) {
						return message.reply(getLang("insufficientFunds", item.price, userMoney));
					}

					// Buy item
					await usersData.set(senderID, {
						money: userMoney - item.price
					});

					// Add to inventory
					if (!economyData.inventory[itemName]) {
						economyData.inventory[itemName] = 0;
					}
					economyData.inventory[itemName]++;
					await usersData.set(senderID, { "economy.inventory": economyData.inventory });

					message.reply(getLang("itemBought", item.name));
				}
				break;
			}

			case "inventory":
			case "inv": {
				let msg = getLang("inventoryTitle") + "\n\n";

				if (!economyData.inventory || Object.keys(economyData.inventory).length === 0) {
					msg += getLang("emptyInventory");
				} else {
					for (const [itemKey, quantity] of Object.entries(economyData.inventory)) {
						// Find item info
						let item = null;
						for (const items of Object.values(shopItems)) {
							if (items[itemKey]) {
								item = items[itemKey];
								break;
							}
						}

						if (item) {
							msg += getLang("inventoryItem", item.name, quantity, item.description) + "\n";
						}
					}
				}

				// Show upgrades
				if (economyData.upgrades) {
					msg += "\n🔧 **UPGRADES:**\n";
					for (const [upgradeKey, level] of Object.entries(economyData.upgrades)) {
						const upgrade = shopItems.upgrades[upgradeKey];
						if (upgrade) {
							msg += `• ${upgrade.name}: Level ${level}\n`;
						}
					}
				}

				message.reply(msg);
				break;
			}

			case "upgrades": {
				let msg = getLang("shopTitle") + "\n\n";
				msg += getLang("itemCategory", "UPGRADES") + "\n";

				for (const [key, item] of Object.entries(shopItems.upgrades)) {
					const currentLevel = economyData.upgrades?.[key] || 1;
					const price = item.price * currentLevel;
					msg += getLang("itemInfo", item.name, price, item.description) + "\n";
				}

				message.reply(msg);
				break;
			}

			case "items": {
				let msg = getLang("shopTitle") + "\n\n";
				msg += getLang("itemCategory", "ITEMS") + "\n";

				for (const [key, item] of Object.entries(shopItems.items)) {
					msg += getLang("itemInfo", item.name, item.price, item.description) + "\n";
				}

				message.reply(msg);
				break;
			}

			case "tools": {
				let msg = getLang("shopTitle") + "\n\n";
				msg += getLang("itemCategory", "TOOLS") + "\n";

				for (const [key, item] of Object.entries(shopItems.tools)) {
					msg += getLang("itemInfo", item.name, item.price, item.description) + "\n";
				}

				message.reply(msg);
				break;
			}

			default: {
				let msg = getLang("shopTitle") + "\n\n";
				msg += "💰 **Your Money:** " + userMoney + "$\n\n";
				msg += getLang("shopCategories") + "\n\n";

				// Show some featured items
				msg += "⭐ **FEATURED ITEMS:**\n";
				msg += getLang("itemInfo", "Lucky Charm", 1000, "Increases casino win chance") + "\n";
				msg += getLang("itemInfo", "Work Boost", 500, "2x work earnings for 1 hour") + "\n";
				msg += getLang("itemInfo", "Bank Level Upgrade", 10000, "Increases bank interest rate") + "\n";

				message.reply(msg);
				break;
			}
		}
	}
};
