const fs = require('fs');
const axios = require('axios');

const baseApiUrl = async () => {
  const base = await axios.get('https://raw.githubusercontent.com/Saim12678/Saim/main/baseApiUrl.json');
  return base.data.api;
};

module.exports.config = {
  name: "gist",
  version: "2.0",
  role: 2,
  author: "Ew’r Saim",
  usePrefix: true,
  description: "Create a Gist from reply or file",
  category: "convert",
  guide: { en: "[filename] or reply only" },
  countDown: 1
};

module.exports.onStart = async function ({ api, event, args }) {
  const admin = ["61573725567297", "61553564375586"];
  if (!admin.includes(event.senderID)) {
    return api.sendMessage("⚠ | Sorry bro eta shudu saim vai use korte parbe.", event.threadID, event.messageID);
  }

  const inputFileName = args[0];
  let code = '';
  let fileName = inputFileName;

  try {
    if (event.type === "message_reply" && event.messageReply.body) {
      code = event.messageReply.body;

      if (!fileName) {
        const time = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        fileName = gist_${time};
      }
    } else if (inputFileName) {
      const filePath = scripts/cmds/${inputFileName}.js;
      code = await fs.promises.readFile(filePath, 'utf-8');
      fileName = inputFileName;
    } else {
      return api.sendMessage("⚠ | Please reply to a code or provide a file name.", event.threadID, event.messageID);
    }

    const encoded = encodeURIComponent(code);
    const apiUrl = await baseApiUrl();

    const response = await axios.post(${apiUrl}/gist, {
      code: encoded,
      nam: fileName.endsWith(".js") ? fileName : ${fileName}.js
    });

    const link = response.data?.data;

    if (!link) throw new Error("Invalid response");

    api.sendMessage(${link}, event.threadID, event.messageID);

  } catch (err) {
    console.error("❌ Gist Error:", err.message || err);
    api.sendMessage("⚠️ Failed to create gist. File not found or server issue.", event.threadID, event.messageID);
  }
};
