const axios = require('axios');

module.exports = {
  config: {
    name: "genderdetector",
    aliases: ["gdn", "gd"],
    version: "2.0",
    author: "Ewr Saim",
    countDown: 5,
    role: 0,
    shortDescription: "Predict gender from name",
    longDescription: "Predict gender from a name with emojis and style",
    category: "utility",
    guide: {
      en: "{pn} [name]"
    }
  },

  onStart: async function ({ message, args }) {
    if (args.length === 0) {
      return message.reply("❌ Please provide a name.\n👉 Example: /gd Saim ");
    }

    const name = args[0];

    try {
      const url = `https://api.genderize.io?name=${encodeURIComponent(name)}`;
      const res = await axios.get(url);
      const { gender, probability } = res.data;

      if (!gender) {
        return message.reply(`⚠️ Couldn't predict gender for "${name}"`);
      }

      const emoji = gender === "male" ? "👦" : gender === "female" ? "👧" : "❓";
      const percent = (parseFloat(probability) * 100).toFixed(2);
      const comment = gender === "male" ? "Looks like a cool guy name 😎" :
                      gender === "female" ? "Sounds like a sweet lady name 💅" :
                      "Could be anyone! 🤔";

      const reply = `
✦─────────────────────────────────✦
     🎯 Gender Prediction Summary
✦─────────────────────────────────✦
🔤 Name       : ${name}
${emoji} Gender     : ${gender.charAt(0).toUpperCase() + gender.slice(1)}
📊 Confidence : ${percent}%
💬 Comment    : ${comment}
✦─────────────────────────────────✦
`;

      return message.reply(reply.trim());
    } catch (error) {
      console.error(error);
      return message.reply("❌ An error occurred while predicting gender. Please try again later.");
    }
  }
};
