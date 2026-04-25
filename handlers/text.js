const fs = require("fs");
const { parseSalesFromTranscript } = require("../services/openai");
const { getAllStock, getLowStockItems, updateStock } = require("../services/supabase");
const { generateBillImage } = require("../services/billImage");
const { sendWhatsApp, uploadWhatsAppMedia, sendWhatsAppImage } = require("../services/whatsapp");
const { handleSummaryMessage } = require("./summary");
const { buildConfirmationMessage } = require("./salesReply");

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
    ...stockItems.map((item) => `\u00B7 ${item.name}: ${item.quantity}`),
  ].join("\n");
}

function buildLowStockList(items) {
  const lowStockItems = Array.isArray(items) ? items : [];

  if (lowStockItems.length === 0) {
    return "\u2705 No low-stock items.";
  }

  return [
    "\u26A0\uFE0F Low Stock",
    ...lowStockItems.map((item) => `\u00B7 ${item.name}: ${item.quantity} left`),
  ].join("\n");
}

function getBillItems(results) {
  return (Array.isArray(results) ? results : [])
    .filter((item) => !item.error && Number(item?.sold || 0) > 0)
    .map((item) => ({
      name: item.name,
      sold: Number(item.sold || 0),
      sellPrice: Number(item.sellPrice || 0),
      newQty: Number(item.newQty || 0),
    }));
}

function getBillTotal(items) {
  return items.reduce((sum, item) => {
    const sellPrice = Number(item.sellPrice || 0);
    if (sellPrice <= 0) {
      return sum;
    }

    return sum + Number(item.sold || 0) * sellPrice;
  }, 0);
}

async function removeFileIfPossible(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("[text] Failed to clean up temporary bill image:", error.message);
    }
  }
}

async function sendBillImageIfPossible(to, results) {
  const billItems = getBillItems(results);

  if (billItems.length === 0) {
    return;
  }

  const total = getBillTotal(billItems);
  let filePath;

  try {
    filePath = await generateBillImage({
      customerPhone: to,
      items: billItems,
      total,
    });

    const uploadResult = await uploadWhatsAppMedia(filePath, "image/png");

    if (!uploadResult || uploadResult.error || !uploadResult.id) {
      console.error("[text] Failed to upload bill image to WhatsApp.");
      return;
    }

    const imageResult = await sendWhatsAppImage(to, uploadResult.id, "ShopMate Bill");

    if (imageResult?.error) {
      console.error("[text] Failed to send bill image to WhatsApp.");
    }
  } catch (error) {
    console.error("[text] Failed to generate or send bill image:", error.message);
  } finally {
    await removeFileIfPossible(filePath);
  }
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

    const reply = await sendWhatsApp(from, buildConfirmationMessage(results));
    await sendBillImageIfPossible(from, results);
    return reply;
  } catch (error) {
    console.error("[text] Text message handling failed:", error.message);
    return sendWhatsApp(from, "Sorry, I couldn't process that message. Send ? for summary.");
  }
}

module.exports = {
  handleTextMessage,
};
