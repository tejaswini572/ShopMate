const fs = require("fs");
const path = require("path");

const { downloadWhatsAppMedia } = require("../services/metaMedia");
const { transcribeAudioFile, parseSalesFromTranscript } = require("../services/openai");
const { suggestProductMatches, updateStock } = require("../services/supabase");
const { generateBillImage } = require("../services/billImage");
const { sendWhatsApp, uploadWhatsAppMedia, sendWhatsAppImage } = require("../services/whatsapp");
const { formatBilingual } = require("./bilingual");
const { buildConfirmationMessage } = require("./salesReply");

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
      console.warn("[voice] Failed to clean up temporary audio file:", error.message);
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
      console.error("[voice] Failed to upload bill image to WhatsApp.");
      return;
    }

    const imageResult = await sendWhatsAppImage(to, uploadResult.id, "ShopMate Bill");

    if (imageResult?.error) {
      console.error("[voice] Failed to send bill image to WhatsApp.");
    }
  } catch (error) {
    console.error("[voice] Failed to generate or send bill image:", error.message);
  } finally {
    await removeFileIfPossible(filePath);
  }
}

async function handleVoiceMessage(from, mediaId) {
  console.log("Voice message received");

  const filePath = path.join("tmp", `voice-${Date.now()}.ogg`);

  try {
    await downloadWhatsAppMedia(mediaId, filePath);

    let transcript;
    try {
      transcript = await transcribeAudioFile(filePath);
    } catch (error) {
      console.error("[voice] Transcription failed:", error.message);
      await sendWhatsApp(from, formatBilingual("\u274C Couldn't hear that clearly. Please send again.", "\u274C \u0d38\u0d4d\u0d2a\u0d37\u0d4d\u0d1f\u0d2e\u0d3e\u0d2f\u0d3f \u0d15\u0d47\u0d7e\u0d15\u0d4d\u0d15\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32. \u0d35\u0d3f\u0d23\u0d4d\u0d1f\u0d41\u0d02 \u0d05\u0d2f\u0d15\u0d4d\u0d15\u0d41."));
      return;
    }

    if (!transcript) {
      await sendWhatsApp(from, formatBilingual("\u274C Couldn't hear that clearly. Please send again.", "\u274C \u0d38\u0d4d\u0d2a\u0d37\u0d4d\u0d1f\u0d2e\u0d3e\u0d2f\u0d3f \u0d15\u0d47\u0d7e\u0d15\u0d4d\u0d15\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32. \u0d35\u0d3f\u0d23\u0d4d\u0d1f\u0d41\u0d02 \u0d05\u0d2f\u0d15\u0d4d\u0d15\u0d41."));
      return;
    }

    const parsed = await parseSalesFromTranscript(transcript);

    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      await sendWhatsApp(from, formatBilingual("I heard you, but couldn't find products or quantities.", "\u0d15\u0d47\u0d1f\u0d4d\u0d1f\u0d41, \u0d2a\u0d15\u0d4d\u0d37\u0d47 \u0d38\u0d3e\u0d27\u0d28\u0d19\u0d4d\u0d19\u0d33\u0d4b \u0d05\u0d33\u0d35\u0d4d\u0d15\u0d33\u0d4b \u0d15\u0d23\u0d4d\u0d1f\u0d46\u0d24\u0d4d\u0d24\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32."));
      return;
    }

    const results = await updateStock(parsed.items);

    if (!Array.isArray(results) || results.length === 0) {
      await sendWhatsApp(from, formatBilingual("I heard you, but couldn't update stock right now.", "\u0d15\u0d47\u0d1f\u0d4d\u0d1f\u0d41, \u0d2a\u0d15\u0d4d\u0d37\u0d47 \u0d07\u0d2a\u0d4d\u0d2a\u0d4b\u0d7e \u0d38\u0d4d\u0d31\u0d4b\u0d15\u0d4d\u0d15\u0d4d \u0d05\u0d2a\u0d4d\u0d21\u0d47\u0d31\u0d4d\u0d31\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d2f\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32."));
      return;
    }

    const unknownNames = results
      .filter((item) => item.error === "not found")
      .map((item) => item.name);
    const suggestions = unknownNames.length > 0 ? await suggestProductMatches(unknownNames) : [];

    const reply = await sendWhatsApp(from, buildConfirmationMessage(results, suggestions));
    if (!reply?.error) {
      await sendBillImageIfPossible(from, results);
    }
  } catch (error) {
    console.error("[voice] Voice message handling failed:", error.message);

    try {
      await sendWhatsApp(from, formatBilingual("Sorry, I couldn't process that voice message.", "\u0d15\u0d4d\u0d37\u0d2e\u0d3f\u0d15\u0d4d\u0d15\u0d23\u0d02, \u0d06 \u0d35\u0d4b\u0d2f\u0d4d\u0d38\u0d4d \u0d2e\u0d46\u0d38\u0d47\u0d1c\u0d4d \u0d2a\u0d4d\u0d30\u0d4b\u0d38\u0d38\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d2f\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32."));
    } catch (sendError) {
      console.error("[voice] Failed to send error reply:", sendError.message);
    }
  } finally {
    await removeFileIfPossible(filePath);
  }
}

module.exports = {
  handleVoiceMessage,
};
