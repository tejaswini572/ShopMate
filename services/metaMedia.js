const fs = require("fs");
const path = require("path");
const axios = require("axios");

function getAuthHeader() {
  const token = process.env.META_ACCESS_TOKEN;

  if (!token) {
    throw new Error("META_ACCESS_TOKEN is required to download WhatsApp media.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function downloadWhatsAppMedia(mediaId, outputPath) {
  if (!mediaId) {
    throw new Error("mediaId is required to download WhatsApp media.");
  }

  if (!outputPath) {
    throw new Error("outputPath is required to save WhatsApp media.");
  }

  const headers = getAuthHeader();

  try {
    const metadataResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      { headers }
    );
    const mediaUrl = metadataResponse.data?.url;

    if (!mediaUrl) {
      throw new Error("Meta media response did not include a download URL.");
    }

    const mediaResponse = await axios.get(mediaUrl, {
      headers,
      responseType: "arraybuffer",
    });

    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(outputPath, Buffer.from(mediaResponse.data));

    return outputPath;
  } catch (error) {
    const status = error.response?.status;
    const details = status ? ` Meta API status: ${status}.` : "";
    const reason = error.message ? ` Reason: ${error.message}` : "";
    throw new Error(`Failed to download WhatsApp media.${details}${reason}`);
  }
}

module.exports = {
  downloadWhatsAppMedia,
};
