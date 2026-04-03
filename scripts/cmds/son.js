module.exports.config = {
    name: "son",
    category: "automation",
    author: "Romim×BaYjid",
    role: 2,
};

const userResponses = {};

module.exports.onStart = async function({ api, event, usersData }) {
    const mention = Object.keys(event.mentions)[0]; 
    if (!mention) return api.sendMessage("❌ দয়া করে একজনকে মেনশন করুন!", event.threadID);

    api.getUserInfo(mention, async (err, userInfo) => {
        if (err) {
            console.error("⚠️ Failed to retrieve user information:", err);
            return api.sendMessage("❌ ইউজারের তথ্য আনতে ব্যর্থ!", event.threadID);
        }

        let genderText;
        switch (userInfo[mention].gender) {
            case 1:
                genderText = "মাইয়া";
                break;
            case 2:
                genderText = "পোলা";
                break;
            default:
                genderText = "হিজড়া";
        }

        const insults = [
            `খাংকির ${genderText}, তোর মার ভোদা তে গাধার মাল ফালাবো! 😈`,
            `তোর মা কে চুদে চুদে পল্টি মারবো, গাধার ${genderText}! 😡`,
            `বাড়ির পাশে আমার মাল ফেলে দিয়ে তোর মা কে চুদতে চাই! 🔥`,
            `চুদা খাওয়া তোর মার, আমি তোর মার ভোদায় টান দিবো! 💣`,
            `তোর মার গুদে ফুল ট্যাবলেট পুশ করে, গাধার ${genderText}! 😛`,
            `তোর বোনের মুখে মাল ফালানোর কথা ভাবি, মাগী ${genderText}!`,
            `তোর মাকে গাধার মতো চুদে তোর মা বলব "এটা কার মাল?"`,
            `তোর মার গুদে ইনপুট দিয়ে আউটপুট নেবো, পোলাপাইন ${genderText}!`,
            `তোর মার ভোদায় গাধার মতো মাল ফালিয়ে দেবো, আজকের রাতেই! 🔥`,
            `এখন মাগীর ${genderText} তোর মার ভোদা চুদে, এক টুকরা দেবো! 😠`,
            `তোর মা কে চুদে পল্টি মারবো, গাধার ${genderText}! 🤡`,
        ];

        let index = 0;
        api.sendMessage(`😆 কিরে ${event.mentions[mention]}! কেমন আছিস..?`, event.threadID);

        if (!userResponses[mention]) {
            userResponses[mention] = { index: 0 };
        }

        api.listenMqtt((err, message) => {
            if (err) {
                console.error("⚠️ MQTT Listener Error:", err);
                return;
            }
            if (message.senderID === mention && message.body) {
                const currentIndex = userResponses[mention].index;
                api.sendMessage(insults[currentIndex % insults.length], message.threadID, message.messageID);
                userResponses[mention].index++;
            }
        });
    });
};
