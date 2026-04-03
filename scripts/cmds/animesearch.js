const axios = require('axios');

async function getStreamFromURL(url) {
    // URL theke video stream nite
    const response = await axios.get(url, { responseType: 'stream' });
    return response.data;
}

async function fetchTikTokVideos(query) {
    try {
        // External API theke query onujayi video list nite
        const response = await axios.get(`https://lyric-search-neon.vercel.app/kshitiz?keyword=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

module.exports = {
    config: {
        name: "anisearch",
        aliases: [],
        author: "Vex_kshitiz",
        version: "1.0",
        shortDescription: { en: "get anime edit" },
        longDescription: { en: "search for anime edits video" },
        category: "anime",
        guide: { en: "{p}{n} [query]" },
    },

    onStart: async function ({ api, event, args }) {
        // User ke react kora (optional)
        api.setMessageReaction("✨", event.messageID, () => {}, true);

        // User command theke query string banano
        const query = args.join(' ');
        if (!query) {
            api.sendMessage({ body: "Please provide a search term!" }, event.threadID, event.messageID);
            return;
        }

        const searchTerm = `${query} anime edit`;

        // API theke videos ana
        const videos = await fetchTikTokVideos(searchTerm);

        if (!videos || videos.length === 0) {
            api.sendMessage({ body: `"${query}" er jonno kono video pelam na.` }, event.threadID, event.messageID);
            return;
        }

        // Random video select kora
        const selectedVideo = videos[Math.floor(Math.random() * videos.length)];
        const videoUrl = selectedVideo.videoUrl;

        if (!videoUrl) {
            api.sendMessage({ body: 'Error: Video URL pawa jay nai.' }, event.threadID, event.messageID);
            return;
        }

        try {
            // Video stream niye pathano
            const videoStream = await getStreamFromURL(videoUrl);
            await api.sendMessage({ body: "", attachment: videoStream }, event.threadID, event.messageID);
        } catch (err) {
            console.error('Video send error:', err);
            api.sendMessage({ body: 'Video pathate somossa hoise. Pore abar try korun.' }, event.threadID, event.messageID);
        }
    },
};
