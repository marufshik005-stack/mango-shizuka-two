module.exports = {
    config: {
        name: "cutbalance",
        aliases: ["deduct", "cutmoney"],
        version: "1.0",
        author: "Your Name",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Cut user's balance"
        },
        longDescription: {
            en: "Cut money from user's main balance or bank balance"
        },
        category: "admin",
        guide: {
            en: "{prefix}cutbalance [uid/reply] [main/bank] [amount]"
        }
    },

    onStart: async function ({ message, args, usersData }) {
        if (args.length < 3) {
            return message.reply("⚠️ Please provide: User ID/reply, balance type (main/bank), and amount to cut");
        }

        let targetID;
        if (message.type == "message_reply") {
            targetID = message.messageReply.senderID;
        } else {
            targetID = args[0];
        }

        const type = args[1].toLowerCase();
        if (type !== "main" && type !== "bank") {
            return message.reply("⚠️ Invalid balance type. Use 'main' or 'bank'");
        }

        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply("⚠️ Please provide a valid amount to cut");
        }

        const userData = await usersData.get(targetID);
        if (!userData) {
            return message.reply("⚠️ User not found!");
        }

        if (type === "main") {
            if (userData.money < amount) {
                return message.reply("⚠️ User doesn't have enough money in main balance");
            }
            await usersData.set(targetID, {
                money: userData.money - amount
            });
            return message.reply(`✅ Successfully cut $${amount} from user's main balance`);
        } else {
            if (userData.bank < amount) {
                return message.reply("⚠️ User doesn't have enough money in bank balance");
            }
            await usersData.set(targetID, {
                bank: userData.bank - amount
            });
            return message.reply(`✅ Successfully cut $${amount} from user's bank balance`);
        }
    }
};