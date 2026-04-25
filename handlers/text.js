const { parseSalesFromTranscript } = require("../services/openai");
const { getAllStock, getLowStockItems, updateStock } = require("../services/supabase");
const { sendWhatsApp } = require("../services/whatsapp");
const { handleSummaryMessage } = require("./summary");

const HELP_TEXT = "Send a voice note or text like: 3 soap, 5 Pepsi sold. Send ? for summary.";

function normalizeText(text) {
  return String(text || "").trim();
}

function buildStockList(items) {
  const stockItems = Array.isArray(items) ? items : [];

  if (stockItems.length === 0) {
    return "Current Stock\nNo stock items found.";
  }

  return [
    "Current Stock",
    ...stockItems.map((item) => `· ${item.name}: ${item.quantity}`),
  ].join("\n");
}

function buildLowStockList(items) {
  const lowStockItems = Array.isArray(items) ? items : [];

  if (lowStockItems.length === 0) {
    return "✅ No low-stock items.";
  }

  return [
    "⚠️ Low Stock",
    ...lowStockItems.map((item) => `· ${item.name}: ${item.quantity} left`),
  ].join("\n");
}

function buildConfirmationMessage(results) {
  const stockResults = Array.isArray(results) ? results : [];
  const updated = stockResults.filter((item) => !item.error);
  const notFound = stockResults.filter((item) => item.error === "not found");
  const lowStock = updated.filter((item) => Number(item.newQty) <= Number(item.minStock));

  const lines = ["✅ Stock updated!"];

  for (const item of updated) {
    lines.push(`· ${item.name}: sold ${item.sold} → ${item.newQty} left`);
  }

  if (notFound.length > 0) {
    lines.push("");
    lines.push("Could not find:");

    for (const item of notFound) {
      lines.push(`· ${item.name}`);
    }
  }

  if (lowStock.length > 0) {
    lines.push("");
    lines.push("⚠️ Running low:");

    for (const item of lowStock) {
      lines.push(`· ${item.name}: only ${item.newQty} left`);
    }
  }

  return lines.join("\n");
}

async function handleTextMessage(from, text) {
  const message = normalizeText(text);
  const lowerMessage = message.toLowerCase();

  try {
    if (!message) {
      return sendWhatsApp(from, HELP_TEXT);
    }

    if (message === "?" || lowerMessage.includes("summary")) {
      return handleSummaryMessage(from);
    }

    if (lowerMessage.includes("low")) {
      const lowStockItems = await getLowStockItems();
      return sendWhatsApp(from, buildLowStockList(lowStockItems));
    }

    if (lowerMessage.includes("stock")) {
      const stockItems = await getAllStock();
      return sendWhatsApp(from, buildStockList(stockItems));
    }

    const parsed = await parseSalesFromTranscript(message);

    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return sendWhatsApp(from, HELP_TEXT);
    }

    const results = await updateStock(parsed.items);

    if (!Array.isArray(results) || results.length === 0) {
      return sendWhatsApp(from, "I found the sale, but couldn't update stock right now.");
    }

    return sendWhatsApp(from, buildConfirmationMessage(results));
  } catch (error) {
    console.error("[text] Text message handling failed:", error.message);
    return sendWhatsApp(from, "Sorry, I couldn't process that message. Send ? for summary.");
  }
}

module.exports = {
  handleTextMessage,
};
