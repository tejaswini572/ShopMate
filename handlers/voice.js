const fs = require("fs");
const path = require("path");

const { downloadWhatsAppMedia } = require("../services/metaMedia");
const { transcribeAudioFile, parseSalesFromTranscript } = require("../services/openai");
const { suggestProductMatches, updateStock } = require("../services/supabase");
const { generateBillImage } = require("../services/billImage");
const { sendWhatsApp, uploadWhatsAppMedia, sendWhatsAppImage } = require("../services/whatsapp");
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
      await sendWhatsApp(from, "\u274C Couldn't hear that clearly. Please send again.");
      return;
    }

    if (!transcript) {
      await sendWhatsApp(from, "\u274C Couldn't hear that clearly. Please send again.");
      return;
    }

    const parsed = await parseSalesFromTranscript(transcript);

    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      await sendWhatsApp(from, "I heard you, but couldn't find products or quantities.");
      return;
    }

    const results = await updateStock(parsed.items);

    if (!Array.isArray(results) || results.length === 0) {
      await sendWhatsApp(from, "I heard you, but couldn't update stock right now.");
      return;
    }

    const unknownNames = results
      .filter((item) => item.error === "not found")
      .map((item) => item.name);
    const suggestions = unknownNames.length > 0 ? await suggestProductMatches(unknownNames) : [];

    await sendWhatsApp(from, buildConfirmationMessage(results, suggestions));
    await sendBillImageIfPossible(from, results);
  } catch (error) {
    console.error("[voice] Voice message handling failed:", error.message);

    try {
      await sendWhatsApp(from, "Sorry, I couldn't process that voice message.");
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
