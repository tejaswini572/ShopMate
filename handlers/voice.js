const fs = require("fs");
const path = require("path");

const { downloadWhatsAppMedia } = require("../services/metaMedia");
const { transcribeAudioFile, parseSalesFromTranscript } = require("../services/openai");
const { updateStock } = require("../services/supabase");
const { sendWhatsApp } = require("../services/whatsapp");

function buildConfirmationMessage(results) {
  const updated = results.filter((item) => !item.error);
  const notFound = results.filter((item) => item.error === "not found");
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
      await sendWhatsApp(from, "❌ Couldn't hear that clearly. Please send again.");
      return;
    }

    if (!transcript) {
      await sendWhatsApp(from, "❌ Couldn't hear that clearly. Please send again.");
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

    await sendWhatsApp(from, buildConfirmationMessage(results));
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
