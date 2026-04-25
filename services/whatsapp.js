const axios = require("axios");

async function sendWhatsApp(to, body) {
  if (process.env.WHATSAPP_MOCK === "true") {
    console.log(`[WHATSAPP MOCK] To: ${to}`);
    console.log(body);
    return { mocked: true };
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn("[whatsapp] Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID. Falling back to mock mode.");
    console.log(`[WHATSAPP MOCK] To: ${to}`);
    console.log(body);
    return { mocked: true };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

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
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const details = error.response?.data || error.message;
    console.error("[whatsapp] Failed to send WhatsApp message.", status ? `Status: ${status}` : "");
    console.error(details);
    return {
      error: true,
      status: status || null,
      details,
    };
  }
}

module.exports = {
  sendWhatsApp,
};
