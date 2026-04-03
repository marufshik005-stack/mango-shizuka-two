const axios = require('axios');

module.exports = {
  config: {
    name: "countryinfo",
    aliases: ["countryinformation", "country"],
    version: "3.1",
    author: "Ew'r Saim",
    category: "information"
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(' ').trim();

    if (!query) {
      return api.sendMessage("❗️ 𝙿𝙻𝙴𝙰𝚂𝙴 𝙿𝚁𝙾𝚅𝙸𝙳𝙴 𝙰 𝙲𝙾𝚄𝙽𝚃𝚁𝚈 𝙽𝙰𝙼𝙴!", event.threadID, event.messageID);
    }

    try {
      // API call here
      const { data } = await axios.get(`https://restcountries.com/v3/name/${encodeURIComponent(query)}`);

      if (!data || data.length === 0) {
        return api.sendMessage("❌ 𝙽𝙾 𝙲𝙾𝚄𝙽𝚃𝚁𝚈 𝙵𝙾𝚄𝙽𝙳 𝚆𝙸𝚃𝙷 𝚃𝙷𝙰𝚃 𝙽𝙰𝙼𝙴. 𝙿𝙻𝙴𝙰𝚂𝙴 𝙲𝙷𝙴𝙲𝙺 𝙰𝙽𝙳 𝚃𝚁𝚈 𝙰𝙶𝙰𝙸𝙽!", event.threadID, event.messageID);
      }

      const c = data[0];

      // Extract data
      const capital = c.capital ? c.capital.join(', ') : 'N/A';
      const population = c.population ? c.population.toLocaleString() : 'N/A';
      const languages = c.languages ? Object.values(c.languages).join(', ') : 'N/A';
      const nativeNames = c.name.nativeName ? Object.values(c.name.nativeName).map(n => n.common).join(', ') : 'N/A';
      const currencies = c.currencies
        ? Object.values(c.currencies).map(cur => `${cur.name} (${cur.symbol || '-'})`).join(', ')
        : 'N/A';
      const borders = c.borders ? c.borders.join(', ') : 'None';
      const area = c.area ? `${c.area.toLocaleString()} km²` : 'N/A';
      const region = c.region || 'N/A';
      const subregion = c.subregion || 'N/A';
      const timezones = c.timezones ? c.timezones.join(', ') : 'N/A';
      const callingCodes = c.idd && c.idd.root && c.idd.suffixes
        ? c.idd.suffixes.map(suf => `${c.idd.root}${suf}`).join(', ')
        : 'N/A';
      const flagURL = c.flags && c.flags.png ? c.flags.png : '';
      const wikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(c.name.common)}`;

      // New additions
      const tld = c.tld ? c.tld.join(', ') : 'N/A';
      const continent = c.continents ? c.continents.join(', ') : 'N/A';
      const googleMaps = c.maps && c.maps.googleMaps ? c.maps.googleMaps : 'N/A';
      const unMember = c.unMember ? 'Yes ✅' : 'No ❌';
      const startOfWeek = c.startOfWeek ? c.startOfWeek.charAt(0).toUpperCase() + c.startOfWeek.slice(1) : 'N/A';
      const altSpellings = c.altSpellings ? c.altSpellings.join(', ') : 'N/A';

      // Local time calculation
      let localTime = 'N/A';
      if (timezones !== 'N/A') {
        try {
          const tz = c.timezones[0];
          const match = tz.match(/UTC([+\-]\d{2}):?(\d{2})?/);
          if (match) {
            const sign = match[1].startsWith('-') ? -1 : 1;
            const hours = parseInt(match[1].replace(/[+\-]/, ''), 10);
            const minutes = match[2] ? parseInt(match[2], 10) : 0;
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const local = new Date(utc + sign * (hours * 3600000 + minutes * 60000));
            localTime = local.toLocaleString('en-US', { hour12: true });
          }
        } catch {
          localTime = 'N/A';
        }
      }

      // Flag emoji generator function
      const getFlagEmoji = (countryCode) => {
        const codePoints = [...countryCode.toUpperCase()]
          .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
      };
      const flagEmoji = c.cca2 ? getFlagEmoji(c.cca2) : '🏳️';

      // Final message without motivational quote
      const message =
`${flagEmoji} 𝗖𝗢𝗨𝗡𝗧𝗥𝗬 𝗜𝗡𝗙𝗢: ${c.name.common.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ 𝙲𝙰𝙿𝙸𝚃𝙰𝙻         : ${capital}
🗣️ 𝙻𝙰𝙽𝙶𝚄𝙰𝙶𝙴(𝚂)     : ${languages}
👥 𝙿𝙾𝙿𝚄𝙻𝙰𝚃𝙸𝙾𝙽      : ${population}
💱 𝙲𝚄𝚁𝚁𝙴𝙽𝙲𝚈        : ${currencies}
📞 𝙲𝙰𝙻𝙻𝙸𝙽𝙶 𝙲𝙾𝙳𝙴    : ${callingCodes}
🌐 𝙸𝙽𝚃𝙴𝚁𝙽𝙴𝚃 𝚃𝙻𝙳    : ${tld}
🌍 𝙲𝙾𝙽𝚃𝙸𝙽𝙴𝙽𝚃       : ${continent}
🗺️ 𝚁𝙴𝙶𝙸𝙾𝙽/𝚂𝚄𝙱𝚁𝙴𝙶𝙸𝙾𝙽: ${region} / ${subregion}
⏰ 𝚃𝙸𝙼𝙴𝚉𝙾𝙽𝙴(𝚂)     : ${timezones}
🕰️ 𝙻𝙾𝙲𝙰𝙻 𝚃𝙸𝙼𝙴      : ${localTime}
📐 𝙰𝚁𝙴𝙰            : ${area}
📍 𝙱𝙾𝚁𝙳𝙴𝚁𝚂         : ${borders}
🏢 𝚄𝙽 𝙼𝙴𝙼𝙱𝙴𝚁       : ${unMember}
🗓️ 𝚆𝙴𝙴𝙺 𝚂𝚃𝙰𝚁𝚃𝚂     : ${startOfWeek}
🔤 𝙽𝙰𝚃𝙸𝚅𝙴 𝙽𝙰𝙼𝙴(𝚂)  : ${nativeNames}
✏️ 𝙰𝙻𝚃 𝚂𝙿𝙴𝙻𝙻𝙸𝙽𝙶𝚂    : ${altSpellings}
━━━━━━━━━━━━━━━━━━━━━━━━━
📌 𝙶𝙾𝙾𝙶𝙻𝙴 𝙼𝙰𝙿𝚂 → ${googleMaps}
📖 𝚆𝙸𝙺𝙸𝙿𝙴𝙳𝙸𝙰   → ${wikiLink}
━━━━━━━━━━━━━━━━━━━━━━━━━
-𝙾𝚆𝙽𝙴𝚁 : 𝚂𝙰𝙸𝙼 • 𝚂𝙰𝙺𝚄𝚁𝙰 𝙱𝙾𝚃 💖✨️`;

      // Send message with flag image if available
      if (flagURL) {
        await api.sendMessage(
          { body: message, attachment: await api.getStreamFromURL(flagURL) },
          event.threadID,
          event.messageID
        );
      } else {
        await api.sendMessage(message, event.threadID, event.messageID);
      }

    } catch (error) {
      await api.sendMessage("❗️ Sorry, error fetching the country information. Please try again later!", event.threadID, event.messageID);
    }
  }
};
