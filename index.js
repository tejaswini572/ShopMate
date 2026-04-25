require("dotenv").config();

const express = require("express");

const openai = require("./services/openai");
const whatsapp = require("./services/whatsapp");
const supabase = require("./services/supabase");
const metaMedia = require("./services/metaMedia");
const voiceHandler = require("./handlers/voice");
const textHandler = require("./handlers/text");
const summaryHandler = require("./handlers/summary");

const app = express();
app.use(express.json());

function getFirstMessage(payload) {
  return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || null;
}

function getSenderPhone(message) {
  return message?.from || null;
}

async function sendUnsupportedMessage(from, type) {
  const sendWhatsApp = whatsapp.sendWhatsApp || whatsapp.sendMessage;

  if (!from || typeof sendWhatsApp !== "function") {
    return;
  }

  try {
    await sendWhatsApp(
      from,
      `ShopMate can currently process only text and voice messages. Received: ${type || "unknown"}.`
    );
  } catch (error) {
    console.error("Failed to send unsupported-message WhatsApp reply:", error.message);
  }
}

async function processWebhookPayload(payload) {
  const message = getFirstMessage(payload);

  if (!message) {
    console.log("Webhook received without a WhatsApp message; ignoring.");
    return;
  }

  const from = getSenderPhone(message);
  const type = message.type;

  if (!from) {
    console.log("Webhook message is missing sender phone number; ignoring.");
    return;
  }

  console.log(`Processing WhatsApp message from ${from}; type=${type || "unknown"}`);

  try {
    if (type === "audio") {
      const audioId = message.audio?.id;

      if (!audioId) {
        console.log("Audio message is missing media id; ignoring.");
        return;
      }

      await voiceHandler.handleVoiceMessage(from, audioId);
      return;
    }

    if (type === "text") {
      const body = message.text?.body;

      if (!body) {
        console.log("Text message is missing body; ignoring.");
        return;
      }

      await textHandler.handleTextMessage(from, body);
      return;
    }

    console.log(`Unsupported WhatsApp message type received: ${type || "unknown"}`);
    await sendUnsupportedMessage(from, type);
  } catch (error) {
    console.error("Webhook message processing failed:", error.message);
  }
}

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "shopmate" });
});

app.get("/webhook", (req, res) => {
  const verifyToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN;

  if (verifyToken && expectedToken && verifyToken === expectedToken) {
    console.log("Webhook verification succeeded.");
    return res.status(200).send(challenge);
  }

  console.log("Webhook verification failed.");
  return res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  console.log("WEBHOOK BODY:", JSON.stringify(req.body, null, 2));

  res.sendStatus(200);

  processWebhookPayload(req.body).catch((error) => {
    console.error("Unhandled webhook processing error:", error.message);
  });
});

function start() {
  const port = process.env.PORT || 3000;
  return app.listen(port, () => {
    console.log(`ShopMate server listening on port ${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  app,
  start,
  processWebhookPayload,
  services: {
    openai,
    whatsapp,
    supabase,
    metaMedia,
  },
  handlers: {
    voice: voiceHandler,
    text: textHandler,
    summary: summaryHandler,
  },
};
