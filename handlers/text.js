const fs = require("fs");
const { parseSalesFromTranscript } = require("../services/openai");
const { getAllStock, getLowStockItems, suggestProductMatches, undoLastSale, updateStock } = require("../services/supabase");
const { generateBillImage } = require("../services/billImage");
const { sendWhatsApp, uploadWhatsAppMedia, sendWhatsAppImage } = require("../services/whatsapp");
const { handleSummaryMessage } = require("./summary");
const { formatBilingual, formatBilingualSections } = require("./bilingual");
const { buildConfirmationMessage } = require("./salesReply");

const HELP_TEXT = formatBilingualSections(
  [
    "ShopMate Help",
    "",
    "Send sales:",
    '"2 soap, 1 notebook sold"',
    "",
    "Commands:",
    "? = today summary",
    "stock = current stock",
    "low = low-stock list",
    "order = supplier order suggestion",
    "help = show this menu",
  ],
  [
    "ShopMate സഹായം",
    "",
    "വിൽപ്പന അയക്കുക:",
    '"2 soap, 1 notebook sold"',
    "",
    "കമാൻഡുകൾ:",
    "? = ഇന്നത്തെ സംഗ്രഹം",
    "stock = നിലവിലെ സ്റ്റോക്ക്",
    "low = സ്റ്റോക്ക് കുറവുള്ളവ",
    "order = വാങ്ങേണ്ട സാധനങ്ങൾ",
    "help = സഹായം കാണിക്കുക",
  ]
);
const SUGGESTION_SKIP_TERMS = ["?", "summary", "stock", "low", "order", "help"];

function isUndoCommand(message) {
  const normalized = String(message || "").trim().toLowerCase();
  return (
    normalized === "undo" ||
    normalized.includes("undo last") ||
    normalized.includes("reverse last") ||
    normalized.includes("\u0d24\u0d3f\u0d30\u0d41\u0d24\u0d4d\u0d24\u0d41") ||
    normalized.includes("undo cheyyu")
  );
}

function buildUndoMessage(result) {
  if (!result?.ok) {
    return formatBilingual(
      "Nothing to undo.",
      "\u0d24\u0d3f\u0d30\u0d41\u0d24\u0d4d\u0d24\u0d3e\u0d7b \u0d35\u0d3f\u0d7d\u0d2a\u0d4d\u0d2a\u0d28 \u0d12\u0d28\u0d4d\u0d28\u0d41\u0d2e\u0d3f\u0d32\u0d4d\u0d32."
    );
  }

  const restoredItems = Array.isArray(result.restored) ? result.restored : [];
  const enLines = ["\u21A9\uFE0F Last sale reversed!", "", "Restored:"];
  const mlLines = ["\u21A9\uFE0F \u0d05\u0d35\u0d38\u0d3e\u0d28 \u0d35\u0d3f\u0d7d\u0d2a\u0d4d\u0d2a\u0d28 \u0d24\u0d3f\u0d30\u0d41\u0d24\u0d4d\u0d24\u0d3f!", "", "\u0d24\u0d3f\u0d30\u0d3f\u0d15\u0d46 \u0d1a\u0d47\u0d7c\u0d24\u0d4d\u0d24\u0d24\u0d4d:"];

  for (const item of restoredItems) {
    if (item?.error) {
      enLines.push(`- ${item.name}: could not restore`);
      mlLines.push(`- ${item.name}: \u0d24\u0d3f\u0d30\u0d3f\u0d15\u0d46 \u0d1a\u0d47\u0d7c\u0d15\u0d4d\u0d15\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32`);
      continue;
    }

    enLines.push(`- ${item.name}: +${item.restored} \u2192 ${item.newQty} now`);
    mlLines.push(`- ${item.name}: +${item.restored} \u2192 \u0d07\u0d2a\u0d4d\u0d2a\u0d4b\u0d7e ${item.newQty}`);
  }

  return formatBilingualSections(enLines, mlLines);
}

function normalizeText(text) {
  return String(text || "").trim();
}

function buildStockList(items) {
  const stockItems = Array.isArray(items) ? items : [];

  if (stockItems.length === 0) {
    return formatBilingualSections(
      ["Current Stock", "No stock items found."],
      ["നിലവിലെ സ്റ്റോക്ക്", "സ്റ്റോക്ക് സാധനങ്ങളില്ല."]
    );
  }

  const enLines = ["Current Stock"];
  const mlLines = ["നിലവിലെ സ്റ്റോക്ക്"];

  for (const item of stockItems) {
    enLines.push(`- ${item.name}: ${item.quantity}`);
    mlLines.push(`- ${item.name}: ${item.quantity}`);
  }

  return formatBilingualSections(enLines, mlLines);
}

function buildLowStockList(items) {
  const lowStockItems = Array.isArray(items) ? items : [];

  if (lowStockItems.length === 0) {
    return formatBilingual("✅ No low-stock items.", "✅ സ്റ്റോക്ക് കുറവുള്ള സാധനങ്ങളില്ല.");
  }

  const enLines = ["⚠️ Running low:"];
  const mlLines = ["⚠️ സ്റ്റോക്ക് കുറവാണ്:"];

  for (const item of lowStockItems) {
    enLines.push(`- ${item.name}: ${item.quantity} left`);
    mlLines.push(`- ${item.name}: ${item.quantity} ബാക്കി`);
  }

  return formatBilingualSections(enLines, mlLines);
}

function buildOrderList(items) {
  const lowStockItems = Array.isArray(items) ? items : [];

  if (lowStockItems.length === 0) {
    return formatBilingualSections(
      ["Suggested Supplier Order", "", "No urgent items to buy."],
      ["വാങ്ങേണ്ട സാധനങ്ങൾ", "", "ഉടന് വാങ്ങേണ്ടതായ സാധനങ്ങളില്ല."]
    );
  }

  const enLines = ["Suggested Supplier Order"];
  const mlLines = ["വാങ്ങേണ്ട സാധനങ്ങൾ"];

  for (const item of lowStockItems) {
    const minStock = Number(item.min_stock || item.minStock || 0);
    const quantity = Number(item.quantity || 0);
    const orderQty = Math.max(1, minStock * 2 - quantity);
    enLines.push(`- ${item.name}: buy ${orderQty}`);
    mlLines.push(`- ${item.name}: ${orderQty} വാങ്ങുക`);
  }

  return formatBilingualSections(enLines, mlLines);
}

function looksLikeProductQuery(message) {
  if (!message || message.length < 3 || !/[a-z]/i.test(message)) {
    return false;
  }

  const lowerMessage = message.toLowerCase();
  return !SUGGESTION_SKIP_TERMS.some((term) => lowerMessage.includes(term));
}

function buildProductSuggestionMessage(input, suggestion) {
  return formatBilingualSections(
    [
      "I could not find a quantity, but this looks like a product.",
      "",
      "Possible match:",
      `- ${input} → ${suggestion}`,
      "",
      "Try sending:",
      `"1 ${suggestion} sold"`,
    ],
    [
      "അളവ് കണ്ടെത്താനായില്ല, പക്ഷേ ഇത് ഒരു സാധനം പോലെ തോന്നുന്നു.",
      "",
      "സാധ്യതയുള്ള സാധനം:",
      `- ${input} → ${suggestion}`,
      "",
      "ഇങ്ങനെ അയക്കുക:",
      `"1 ${suggestion} sold"`,
    ]
  );
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

    if (lowerMessage === "help") {
      return sendWhatsApp(from, HELP_TEXT);
    }

    if (isUndoCommand(message)) {
      const undoResult = await undoLastSale();
      return sendWhatsApp(from, buildUndoMessage(undoResult));
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

    if (lowerMessage.includes("order")) {
      const lowStockItems = await getLowStockItems();
      return sendWhatsApp(from, buildOrderList(lowStockItems));
    }

    const parsed = await parseSalesFromTranscript(message);

    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      if (looksLikeProductQuery(message)) {
        const suggestions = await suggestProductMatches([message]);
        const suggestion = suggestions[0]?.suggestion;

        if (suggestion) {
          return sendWhatsApp(from, buildProductSuggestionMessage(message, suggestion));
        }
      }

      return sendWhatsApp(from, HELP_TEXT);
    }

    const results = await updateStock(parsed.items);

    if (!Array.isArray(results) || results.length === 0) {
      return sendWhatsApp(
        from,
        formatBilingual(
          "I found the sale, but couldn't update stock right now.",
          "വിൽപ്പന കണ്ടെത്തി, പക്ഷേ ഇപ്പോള്‍ സ്റ്റോക്ക് അപ്ഡേറ്റ് ചെയ്യാനായില്ല."
        )
      );
    }

    const unknownNames = results
      .filter((item) => item.error === "not found")
      .map((item) => item.name);
    const suggestions = unknownNames.length > 0 ? await suggestProductMatches(unknownNames) : [];

    const reply = await sendWhatsApp(from, buildConfirmationMessage(results, suggestions));
    if (!reply?.error) {
      await sendBillImageIfPossible(from, results);
    }
    return reply;
  } catch (error) {
    console.error("[text] Text message handling failed:", error.message);
    return sendWhatsApp(
      from,
      formatBilingual(
        "Sorry, I couldn't process that message. Send ? for summary.",
        "ക്ഷമിക്കണം, ആ മെസേജ് പ്രോസസ് ചെയ്യാനായില്ല. സംഗ്രഹത്തിന് ? അയക്കൂ."
      )
    );
  }
}

module.exports = {
  handleTextMessage,
};
