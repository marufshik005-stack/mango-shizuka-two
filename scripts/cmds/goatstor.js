const fs = require('fs-extra'); // fs-extra is often preferred in these frameworks
const axios = require('axios');

// Cache the API URL to avoid unnecessary GitHub requests
let cachedApiUrl = null;
const getBaseApiUrl = async () => {
  if (cachedApiUrl) return cachedApiUrl;
  const res = await axios.get('https://raw.githubusercontent.com/Saim12678/Saim/main/baseApiUrl.json');
  cachedApiUrl = res.data.api;
  return cachedApiUrl;
};

module.exports.config = {
  name: "gist",
  version: "2.1",
  role: 2, // Admin only based on framework settings
  author: "Ew’r Saim",
  usePrefix: true,
  description: "Create a Gist from reply or file",
  category: "convert",
  guide: { en: "[filename] or reply to code" },
  countDown: 5
};

module.exports.onStart = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, type, messageReply } = event;
  
  // Admin Check
  const admins = ["61573725567297", "61553564375586"];
  if (!admins.includes(senderID)) {
    return api.sendMessage("⚠ | Sorry bro, this command is restricted to Saim only.", threadID, messageID);
  }

  let code = '';
  let fileName = args[0];

  try {
    // Logic for Reply
    if (type === "message_reply" && messageReply.body) {
      code = messageReply.body;
      if (!fileName) {
        const time = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        fileName = `gist_${time}.js`;
      }
    } 
    // Logic for Local File
    else if (fileName) {
      const filePath = `./scripts/cmds/${fileName}${fileName.endsWith('.js') ? '' : '.js'}`;
      if (!fs.existsSync(filePath)) {
        return api.sendMessage(`❌ | File not found: ${fileName}.js`, threadID, messageID);
      }
      code = await fs.readFile(filePath, 'utf-8');
    } 
    else {
      return api.sendMessage("⚠ | Please reply to a code snippet or provide a filename.", threadID, messageID);
    }

    api.sendMessage("⏳ | Creating Gist, please wait...", threadID, messageID);

    const apiUrl = await getBaseApiUrl();
    const response = await axios.post(`${apiUrl}/gist`, {
      code: encodeURIComponent(code), // Kept as per your original logic
      nam: fileName.endsWith(".js") ? fileName : `${fileName}.js`
    });

    const link = response.data?.data;
    if (!link) throw new Error("API returned an empty link.");

    api.sendMessage(`✅ Gist Created Successfully!\n🔗 Link: ${link}`, threadID, messageID);

  } catch (err) {
    console.error("❌ Gist Error:", err);
    api.sendMessage(`⚠️ Error: ${err.message || "Server issue."}`, threadID, messageID);
  }
};
