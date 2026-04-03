const axios = require("axios");
let Romim, download, send, apireq;
let name = "xgen";

module.exports.config = {
  name: name,
  category: "image generator",
  author: "Mostakim",
};

module.exports.onStart = async function ({ message, api, event, args }) {
  Romim = args.join("");
  const soru = new Date().getTime();
  const { threadID, messageID } = event;
  send = api.sendMessage("wait a few sec", threadID, messageID);

  if (!Romim) {
    api.sendMessage("please give me a prompt ", threadID, messageID);
    return;
  }

  try {
    apireq = (`https://mostakim.onrender.com/art2?prompt=${Romim}`);

    const joinat = await global.utils.getStreamFromURL(apireq);

    api.setMessageReaction("✅", event.messageID, (err) => {}, true);

    message.unsend(send.messageID);

    const time = new Date().getTime();
    await message.reply({
      body: `Here's your image\nTime: ${(time - soru) / 1000} second/s`,
      attachment: joinat,
    });
  } catch (e) {
    api.sendMessage(`${e.message}`, threadID, messageID);
  }
};
