const FormData = require('form-data');
const axios = require('axios');
const { getStreamFromURL } = global.utils;
const regCheckURL = /^(http|https):\/\/[^ "]+$/;

module.exports = {
  config: {
    name: "imgbb",
    version: "1.0",
    author: "Jubayer",
    countDown: 5,
    role: 0,
    shortDescription: "Upload image to ImgBB",
    longDescription: "Upload an image or GIF to ImgBB and get the direct link",
    category: "utility",
    guide: "{pn}imgbb <image_url_or_reply_to_image>"
  },

  onStart: async function ({ message, event, args, api, commandName }) {
    if (this.config.author !== "Jubayer") {
      return message.reply(`[❌] • Unauthorized modification detected in "${commandName}" command. Author mismatch.`);
    }

    try {
      let imageStream;
      let isGif = false;

      if (event.messageReply?.attachments?.length > 0) {
        const attachment = event.messageReply.attachments[0];
        if (attachment.type === "photo" || attachment.type === "animated_image") {
          imageStream = await getStreamFromURL(attachment.url);
          isGif = attachment.type === "animated_image";
        }
      }
      else if (args[0] && regCheckURL.test(args[0])) {
        imageStream = await getStreamFromURL(args[0]);
        isGif = args[0].toLowerCase().endsWith('.gif');
      } else {
        return message.reply("[⚜️] • Please provide an image URL or reply to an image/GIF.");
      }

      if (!imageStream) {
        return message.reply("Failed to get image stream ❌.");
      }

      const authResponse = await axios.get('https://imgbb.com');
      const auth_token = authResponse.data.match(/auth_token="([^"]+)"/)[1];

      const form = new FormData();
      form.append('source', imageStream);
      form.append('type', 'file');
      form.append('action', 'upload');
      form.append('timestamp', Date.now());
      form.append('auth_token', auth_token);

      const response = await axios.post('https://imgbb.com/json', form, {
        headers: {
          ...form.getHeaders()
        }
      });

      if (response.data.success) {
        const imageUrl = response.data.image.url;
        const finalUrl = isGif ? `${imageUrl}.gif` : `${imageUrl}.jpeg`;
        
        return message.reply(`Image uploaded successfully!✅\n\nLink: ${finalUrl}`);
      } else {
        return message.reply("Failed to upload image to ImgBB ⁉️.");
      }
    } catch (error) {
      console.error(error);
      return message.reply("An error occurred while uploading the image.");
    }
  }
};
