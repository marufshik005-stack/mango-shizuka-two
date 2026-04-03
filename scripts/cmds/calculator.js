const math = require('mathjs');

module.exports.config = {
  name: "calculator",
  version: "2.3.1",
  role: 0,
  author: "Ew'r Saim",
  usePrefix: true,
  description: "Solve math expressions with style",
  category: "utility",
  guide: {
    en: "!calculator [expression]\nSupports + - × ÷ ^ sqrt() log() etc."
  }
};

module.exports.onStart = async function ({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage(
`📘 | Calculator Command Use Korar Niom:

🔹 Syntax:
!calculator [expression]

🔹 Example (Bangla-style):
• !calculator ৫ + ৩
• !calculator ১০ - ৪
• !calculator ৬ × ৩
• !calculator ১২ ÷ ৪
• !calculator (২ + ৩) × ২
• !calculator ২^৩
• !calculator sqrt(২৫)

🔸 Tip: × = *, ÷ = /
🔢 Bangla digit auto English e convert hobe.
🧠 Powered by mathjs`,
      event.threadID,
      event.messageID
    );
  }

  // Bangla to English digit conversion
  const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  const englishDigits = ['0','1','2','3','4','5','6','7','8','9'];

  const banglaToEnglish = (text) => {
    return text.replace(/[০-৯]/g, d => englishDigits[banglaDigits.indexOf(d)]);
  };

  const rawInput = args.join(" ");

  // Replace Bangla digits + × ÷ to standard
  const expression = banglaToEnglish(rawInput)
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  try {
    const result = math.evaluate(expression);

    const box = `
┌─📐 Calculator
│ 📥: ${expression}
│ 📤: ${result}
└─────────────¤》`;

    api.sendMessage(box.trim(), event.threadID, event.messageID);
  } catch (err) {
    const errorBox = `
┌─❌ Error
│ ⚠️  ${err.message}
└──────────────▪︎》`;
    api.sendMessage(errorBox.trim(), event.threadID, event.messageID);
  }
};
