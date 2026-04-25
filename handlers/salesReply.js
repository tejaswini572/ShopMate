const { formatBilingualSections } = require("./bilingual");

function formatRupees(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "\u20B90";
  }

  if (Number.isInteger(amount)) {
    return `\u20B9${amount}`;
  }

  return `\u20B9${amount.toFixed(2).replace(/\.?0+$/, "")}`;
}

function buildUpdatedItemLine(item) {
  const sold = Number(item?.sold || 0);
  const sellPrice = Number(item?.sellPrice || 0);

  if (sellPrice > 0) {
    const lineTotal = sold * sellPrice;
    return {
      en: `- ${item.name}: sold ${sold} \u00D7 ${formatRupees(sellPrice)} = ${formatRupees(lineTotal)} \u2192 ${item.newQty} left`,
      ml: `- ${item.name}: ${sold} \u0d35\u0d3f\u0d31\u0d4d\u0d31\u0d41 \u2192 ${item.newQty} \u0d2c\u0d3e\u0d15\u0d4d\u0d15\u0d3f`,
    };
  }

  return {
    en: `- ${item.name}: sold ${sold} \u2192 ${item.newQty} left`,
    ml: `- ${item.name}: ${sold} \u0d35\u0d3f\u0d31\u0d4d\u0d31\u0d41 \u2192 ${item.newQty} \u0d2c\u0d3e\u0d15\u0d4d\u0d15\u0d3f`,
  };
}

function buildConfirmationMessage(results, suggestions) {
  const stockResults = Array.isArray(results) ? results : [];
  const updated = stockResults.filter((item) => !item.error);
  const notFound = stockResults.filter((item) => item.error === "not found");
  const lowStock = updated.filter((item) => Number(item.newQty) <= Number(item.minStock));
  const suggestionList = Array.isArray(suggestions) ? suggestions : [];
  const suggestionMap = new Map(suggestionList.map((item) => [item.input, item.suggestion]));

  let billTotal = 0;
  let hasBillableItems = false;

  const enLines = ["\u2705 Stock updated!"];
  const mlLines = ["\u2705 \u0d38\u0d4d\u0d31\u0d4b\u0d15\u0d4d\u0d15\u0d4d \u0d05\u0d2a\u0d4d\u0d21\u0d47\u0d31\u0d4d\u0d31\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d24\u0d41!"];

  if (updated.length > 0) {
    enLines.push("", "Items:");
    mlLines.push("", "\u0d38\u0d3e\u0d27\u0d28\u0d19\u0d4d\u0d19\u0d7e:");

    for (const item of updated) {
      const sold = Number(item?.sold || 0);
      const sellPrice = Number(item?.sellPrice || 0);

      if (sellPrice > 0) {
        billTotal += sold * sellPrice;
        hasBillableItems = true;
      }

      const line = buildUpdatedItemLine(item);
      enLines.push(line.en);
      mlLines.push(line.ml);
    }
  }

  if (hasBillableItems) {
    enLines.push("", `Bill total: ${formatRupees(billTotal)}`);
    mlLines.push("", `\u0d06\u0d15\u0d46 \u0d2c\u0d3f\u0d7d: ${formatRupees(billTotal)}`);
  }

  if (notFound.length > 0) {
    enLines.push("", "Could not find:");
    mlLines.push("", "\u0d15\u0d23\u0d4d\u0d1f\u0d46\u0d24\u0d4d\u0d24\u0d3e\u0d28\u0d3e\u0d2f\u0d3f\u0d32\u0d4d\u0d32:");

    for (const item of notFound) {
      enLines.push(`- ${item.name}`);
      mlLines.push(`- ${item.name}`);
    }

    enLines.push("", "Possible matches:");
    mlLines.push("", "\u0d38\u0d3e\u0d27\u0d4d\u0d2f\u0d24\u0d2f\u0d41\u0d33\u0d4d\u0d33 \u0d38\u0d3e\u0d27\u0d28\u0d19\u0d4d\u0d19\u0d7e:");

    for (const item of notFound) {
      const suggestion = suggestionMap.get(item.name);
      enLines.push(`- ${item.name} \u2192 ${suggestion || "no close match found"}`);
      mlLines.push(`- ${item.name} \u2192 ${suggestion || "no close match found"}`);
    }
  }

  if (lowStock.length > 0) {
    enLines.push("", "\u26A0\uFE0F Running low:");
    mlLines.push("", "\u26A0\uFE0F \u0d38\u0d4d\u0d31\u0d4b\u0d15\u0d4d\u0d15\u0d4d \u0d15\u0d41\u0d31\u0d35\u0d3e\u0d23\u0d4d:");

    for (const item of lowStock) {
      enLines.push(`- ${item.name}: only ${item.newQty} left`);
      mlLines.push(`- ${item.name}: ${item.newQty} \u0d2e\u0d3e\u0d24\u0d4d\u0d30\u0d02 \u0d2c\u0d3e\u0d15\u0d4d\u0d15\u0d3f`);
    }
  }

  if (updated.length > 0) {
    enLines.push("", 'Reply "undo" to reverse this sale.');
    mlLines.push("", '\u0d24\u0d3f\u0d30\u0d41\u0d24\u0d4d\u0d24\u0d3e\u0d7b "undo" \u0d05\u0d2f\u0d15\u0d4d\u0d15\u0d41\u0d15.');
  }

  return formatBilingualSections(enLines, mlLines);
}

module.exports = {
  buildConfirmationMessage,
};
