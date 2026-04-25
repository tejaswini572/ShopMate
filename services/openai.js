const fs = require("fs");
const OpenAI = require("openai");

const MOCK_TRANSCRIPT = "ഇന്ന് 3 soap, 5 Pepsi, 1 rice bag വിറ്റു";
const MOCK_PARSED_SALES = {
  customer: null,
  items: [
    { name: "Soap", qty: 3 },
    { name: "Pepsi", qty: 5 },
    { name: "Rice bag 5kg", qty: 1 },
  ],
};

const SYSTEM_PROMPT = `You are an AI assistant for a Kerala kirana shop.
The owner may speak Malayalam, English, Tamil, Hindi, or mixed language.
Extract sold products and quantities.
Return only valid JSON.
Format:
{
  "customer": string or null,
  "items": [
    { "name": string, "qty": number }
  ]
}

Rules:
- Use simple English product names.
- Quantity must be a number.
- If quantity is "oru", "one", or "ഒരു", use 1.
- If no product sale is found, return:
{ "customer": null, "items": [] }`;

let client;

function isMockMode() {
  return process.env.OPENAI_MOCK === "true";
}

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

function stripJsonMarkdown(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeParsedSales(parsed) {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    return null;
  }

  return {
    customer: typeof parsed.customer === "string" ? parsed.customer : null,
    items: parsed.items
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        name: String(item.name || "").trim(),
        qty: Number(item.qty),
      }))
      .filter((item) => item.name && Number.isFinite(item.qty)),
  };
}

async function transcribeAudioFile(filePath) {
  if (isMockMode()) {
    return MOCK_TRANSCRIPT;
  }

  const response = await getClient().audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-mini-transcribe",
  });

  if (typeof response === "string") {
    return response;
  }

  return response?.text || "";
}

async function parseSalesFromTranscript(transcript) {
  if (isMockMode()) {
    return MOCK_PARSED_SALES;
  }

  try {
    const response = await getClient().chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript || "" },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    const cleaned = stripJsonMarkdown(content);
    const parsed = JSON.parse(cleaned);

    return normalizeParsedSales(parsed);
  } catch (error) {
    console.error("OpenAI sales parsing failed:", error.message);
    return null;
  }
}

module.exports = {
  transcribeAudioFile,
  parseSalesFromTranscript,
};
