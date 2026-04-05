const { config } = global.GoatBot;

module.exports = {
    config: {
        name: "balance",
        aliases: ["bal", "money"],
        version: "1.6.9",
        author: "zisan",
        countDown: 1,
        role: 0,
        description: "View, transfer, request, or add/delete money",
        category: "economy",
        guide: { en: `
            {pn}: help to view cmds guide
            {pn}: view your balance
            {pn} <@tag>: view the balance of the tagged person
            {pn} transfer <@tag>/<UID>/<reply> <amount>: transfer money
            {pn} request <amount>: request money from the admin
            {pn} add <@tag>/<UID>/<reply> <amount>: admin adds money
            {pn} delete <@tag>/<UID>/<reply> <amount>: admin deletes money` }
    },

    onStart: async function ({ message, usersData, event, args, api }) {
        const senderID = event.senderID;
        const allowedUIDs = [config.adminBot, ...config.adminBot];

        // Bold text converter map
        const boldMap = {
            A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈", J: "𝐉", K: "𝐊", L: "𝐋", M: "𝐌", N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑", S: "𝐒", T: "𝐓", U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙",
            a: "𝐚", b: "𝐛", c: "𝐜", d: "𝐝", e: "𝐞", f: "𝐟", g: "𝐠", h: "𝐡", i: "𝐢", j: "𝐣", k: "𝐤", l: "𝐥", m: "𝐦", n: "𝐧", o: "𝐨", p: "𝐩", q: "𝐪", r: "𝐫", s: "𝐬", t: "𝐭", u: "𝐮", v: "𝐯", w: "𝐰", x: "𝐱", y: "𝐲", z: "𝐳",
            0: "𝟎", 1: "𝟏", 2: "𝟐", 3: "𝟑", 4: "𝟒", 5: "𝟓", 6: "𝟔", 7: "𝟕", 8: "𝟖", 9: "𝟗", ".": "."
        };
        
        const toBold = (text) => text.split("").map(char => boldMap[char] || char).join("");

        const formatMoney = (num) => {
            const units = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "N", "D"];
            let unit = 0;
            let number = Number(num);

            while (number >= 1000 && unit < units.length - 1) {
                number /= 1000;
                unit++;
            }

            // parseFloat removes trailing zeros (e.g., 43.80 becomes 43.8)
            return `${parseFloat(number.toFixed(2))}${units[unit]}`;
        };

        const isValidAmount = (value) => {
            const num = Number(value);
            return !isNaN(num) && num > 0;
        };

        const getTargetUID = () => {
            if (event.messageReply) return event.messageReply.senderID;
            if (Object.keys(event.mentions).length > 0) return Object.keys(event.mentions)[0];
            if (!isNaN(args[1])) return args[1];
            return null;
        };

        const getAmount = () => args[args.length - 1];

        if (args[0] === "help") {
            return message.reply(`1.${config.prefix} balance: View your balance.
2. ${config.prefix} balance <@tag>: View another user's balance.
3. ${config.prefix} balance transfer <UID> <amount>: Transfer money.
4. ${config.prefix} balance request <amount>: Request money from admin.
5. ${config.prefix} balance add <UID> <amount>: Admin adds money.
6. ${config.prefix} balance delete <UID> <amount>: Admin deletes money.`);
        }

        if (args[0] === "add") {
            if (!allowedUIDs.includes(senderID)) {
                return message.reply("❌ You don't have permission to use this command.");
            }

            const targetUID = getTargetUID();
            const amount = getAmount();

            if (!targetUID) {
                return message.reply("❌ Could not identify the user. Make sure to tag, reply, or provide a valid UID.");
            }
            if (!isValidAmount(amount)) {
                return message.reply("❌ Please provide a valid positive amount.");
            }

            const userData = await usersData.get(targetUID) || { money: "0" };
            const userName = userData.name || "Unknown User";
            const newBalance = (Number(userData.money) + Number(amount)).toString();

            await usersData.set(targetUID, { money: newBalance });

            return message.reply(`✅ Successfully added ${formatMoney(amount)}$ to the balance of ${userName} (UID: ${targetUID}).`);
        }

        if (args[0] === "delete") {
            if (!allowedUIDs.includes(senderID)) {
                return message.reply("❌ You don't have permission to use this command.");
            }

            const targetUID = getTargetUID();
            const amount = getAmount();

            if (!targetUID) {
                return message.reply("❌ Could not identify the user. Make sure to tag, reply, or provide a valid UID.");
            }
            if (!isValidAmount(amount)) {
                return message.reply("❌ Please provide a valid positive amount.");
            }

            const userData = await usersData.get(targetUID) || { money: "0" };
            const userName = userData.name || "Unknown User";
            const currentBalance = Number(userData.money);

            if (currentBalance < Number(amount)) {
                return message.reply("❌ The target does not have enough money to delete.");
            }

            const newBalance = (currentBalance - Number(amount)).toString();

            await usersData.set(targetUID, { money: newBalance });

            return message.reply(`✅ Successfully deleted ${formatMoney(amount)}$ from the balance of ${userName} (UID: ${targetUID}).`);
        }

        if (args[0] === "transfer") {
            const targetUID = getTargetUID();
            const amount = getAmount();

            if (!targetUID) {
                return message.reply("❌ Could not identify the user. Make sure to tag, reply, or provide a valid UID.");
            }
            if (targetUID === senderID) {
                return message.reply("❌ You cannot transfer money to yourself.");
            }
            if (!isValidAmount(amount)) {
                return message.reply("❌ Please provide a valid positive amount.");
            }

            const senderData = await usersData.get(senderID) || { money: "0" };
            const recipientData = await usersData.get(targetUID) || { money: "0" };
            const recipientName = recipientData.name || "Unknown User";

            const senderBalance = Number(senderData.money);
            const recipientBalance = Number(recipientData.money);

            if (senderBalance < Number(amount)) {
                return message.reply("❌ You don't have enough money to transfer.");
            }

            const updatedSenderBalance = (senderBalance - Number(amount)).toString();
            const updatedRecipientBalance = (recipientBalance + Number(amount)).toString();

            await usersData.set(senderID, { money: updatedSenderBalance });
            await usersData.set(targetUID, { money: updatedRecipientBalance });

            return message.reply(`✅ Successfully transferred ${formatMoney(amount)}$ to ${recipientName} (UID: ${targetUID}).`);
        }

        if (args[0] === "request") {
            const amount = args[1];

            if (!isValidAmount(amount)) {
                return message.reply("❌ Please enter a valid positive amount.");
            }

            const data = await usersData.get(senderID);
            const name = data.name || "Darling";

            const adminIDs = ["100049220893428"];
            const threadIDs = ["9191391594224159", "7272501799469344"];

            const requestMessage = `📢 User ${name} (${senderID}) has requested ${formatMoney(amount)}$.`;

            for (const adminID of adminIDs) {
                api.sendMessage(requestMessage, adminID);
            }
            for (const threadID of threadIDs) {
                api.sendMessage(requestMessage, threadID);
            }

            return message.reply(`✅ Your request for ${formatMoney(amount)}$ has been sent to the admins.`);
        }

        // Check someone else's balance
        if (Object.keys(event.mentions).length > 0 || event.messageReply || !isNaN(args[0])) {
            const targetUID = getTargetUID();

            if (!targetUID) {
                return message.reply("❌ Could not identify the user. Use UID instead.");
            }

            const userData = await usersData.get(targetUID) || { money: "0", name: "Unknown User" };
            const userName = userData.name || "Unknown User";
            const userMoney = userData.money || "0";

            return message.reply(`🎀 ${toBold(userName.toUpperCase())}\n\n𝐔𝐬𝐞𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞: $${toBold(formatMoney(userMoney))}`);
        }

        // Check own balance (Default)
        const userData = await usersData.get(senderID) || { money: "0", name: "Unknown User" };
        const userName = userData.name || "Unknown User";

        return message.reply(`🎀 ${toBold(userName.toUpperCase())}\n\n𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞: $${toBold(formatMoney(userData.money))}`);
    }
};
