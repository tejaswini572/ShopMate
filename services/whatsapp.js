const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

function getWhatsAppConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn("[whatsapp] Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID. Falling back to mock mode.");
    return null;
  }

  return {
    accessToken,
    phoneNumberId,
  };
}

function isMockMode() {
  return process.env.WHATSAPP_MOCK === "true";
}

function logWhatsAppApiError(prefix, error) {
  const status = error.response?.status;
  const details = error.response?.data || error.message;
  const code = details?.error?.code;

  console.error(prefix, status ? `Status: ${status}` : "");
  console.error(details);

  if (status === 401 || code === 190) {
    console.error("[whatsapp] META_ACCESS_TOKEN looks invalid or expired. Generate a fresh WhatsApp access token and update .env.");
  }

  return {
    error: true,
    status: status || null,
    details,
  };
}

async function sendWhatsApp(to, body) {
  if (isMockMode()) {
    console.log(`[WHATSAPP MOCK] To: ${to}`);
    console.log(body);
    return { mocked: true };
  }

  const config = getWhatsAppConfig();
  if (!config) {
    console.log(`[WHATSAPP MOCK] To: ${to}`);
    console.log(body);
    return { mocked: true };
  }

  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    return logWhatsAppApiError("[whatsapp] Failed to send WhatsApp message.", error);
  }
}

async function uploadWhatsAppMedia(filePath, mimeType) {
  if (isMockMode()) {
    console.log(`[WHATSAPP MOCK] Upload media: ${filePath}`);
    return {
      mocked: true,
      id: `mock-media-${Date.now()}`,
    };
  }

  const config = getWhatsAppConfig();
  if (!config) {
    console.log(`[WHATSAPP MOCK] Upload media: ${filePath}`);
    return {
      mocked: true,
      id: `mock-media-${Date.now()}`,
    };
  }

  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/media`;
  const form = new FormData();

  form.append("messaging_product", "whatsapp");
  form.append("file", fs.createReadStream(filePath), {
    contentType: mimeType || "image/png",
    filename: filePath.split(/[/\\]/).pop(),
  });

  try {
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${config.accessToken}`,
      },
      maxBodyLength: Infinity,
    });

    return response.data;
  } catch (error) {
    return logWhatsAppApiError("[whatsapp] Failed to upload WhatsApp media.", error);
  }
}

async function sendWhatsAppImage(to, mediaId, caption) {
  const safeCaption = caption || " ShopMate Bill";

  if (isMockMode()) {
    console.log(`[WHATSAPP MOCK] Send image to: ${to}`);
    console.log({ mediaId, caption: safeCaption });
    return { mocked: true };
  }

  const config = getWhatsAppConfig();
  if (!config) {
    console.log(`[WHATSAPP MOCK] Send image to: ${to}`);
    console.log({ mediaId, caption: safeCaption });
    return { mocked: true };
  }

  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: {
          id: mediaId,
          caption: safeCaption,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    return logWhatsAppApiError("[whatsapp] Failed to send WhatsApp image.", error);
  }
}

async function verifyWhatsAppAuth() {
  if (isMockMode()) {
    return { mocked: true };
  }

  const config = getWhatsAppConfig();
  if (!config) {
    return { error: true, message: "Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID" };
  }

  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}?fields=id,display_phone_number`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    return logWhatsAppApiError("[whatsapp] WhatsApp auth verification failed.", error);
  }
}

module.exports = {
  sendWhatsApp,
  uploadWhatsAppMedia,
  sendWhatsAppImage,
  verifyWhatsAppAuth,
};
