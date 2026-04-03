const axios = require("axios");

module.exports.config = {
  name: "fluxgen",
  version: "2.0",
  role: 0,
  author: "Dipto // Eren",
  description: "Flux Image Generator",
  category: "image generator",
  premium: true,
  guide: "{pn} [prompt] --ratio 1024x1024\n{pn} [prompt]",
  countDown: 15,
  onChat: true,
  prefix: false
};

async function generateImage({ args, event, api }) {
  const dipto = "https://www.noobs-api.rf.gd/dipto";
  try {
    const prompt = args.join(" ");
    const [prompt2, ratio = "1:1"] = prompt.includes("--ratio")
      ? prompt.split("--ratio").map(s => s.trim())
      : [prompt, "1:1"];

    const startTime = Date.now();

    const waitMessage = await api.sendMessage("Generating image, please wait... 😘", event.threadID);
    api.setMessageReaction("⌛", event.messageID, () => {}, true);

    const apiurl = `${dipto}/flux?prompt=${encodeURIComponent(prompt2)}&ratio=${encodeURIComponent(ratio)}`;
    const response = await axios.get(apiurl, { responseType: "stream" });

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    api.unsendMessage(waitMessage.messageID);

    const sentMessage = await api.sendMessage({
      body: `✨ Here's your magical image! ✨\n⏱️ Generated in ${timeTaken} seconds.\n\nEnjoy your art, sweetheart!`,
      attachment: response.data,
    }, event.threadID, event.messageID);

    api.setMessageReaction("❤️", sentMessage.messageID, () => {}, true);

  } catch (e) {
    console.error(e);
    api.sendMessage("Error: " + e.message, event.threadID, event.messageID);
  }
}

// Prefix-based
module.exports.onStart = async function ({ event, args, api }) {
  if (!args[0]) return api.sendMessage("Please provide a prompt!", event.threadID, event.messageID);
  return generateImage({ args, event, api });
};

// No-prefix-based
module.exports.onChat = async function ({ event, api }) {
  if (!event.body?.toLowerCase().startsWith("f ")) return;
  const args = event.body.slice(2).trim().split(" ");
  if (!args[0]) return;
  return generateImage({ args, event, api });
};
