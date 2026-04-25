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
    return `- ${item.name}: sold ${sold} \u00D7 ${formatRupees(sellPrice)} = ${formatRupees(lineTotal)} \u2192 ${item.newQty} left`;
  }

  return `- ${item.name}: sold ${sold} \u2192 ${item.newQty} left`;
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

  const lines = ["\u2705 Stock updated!"];

  if (updated.length > 0) {
    lines.push("");
    lines.push("Items:");

    for (const item of updated) {
      const sold = Number(item?.sold || 0);
      const sellPrice = Number(item?.sellPrice || 0);

      if (sellPrice > 0) {
        billTotal += sold * sellPrice;
        hasBillableItems = true;
      }

      lines.push(buildUpdatedItemLine(item));
    }
  }

  if (hasBillableItems) {
    lines.push("");
    lines.push(`Bill total: ${formatRupees(billTotal)}`);
  }

  if (notFound.length > 0) {
    lines.push("");
    lines.push("Could not find:");

    for (const item of notFound) {
      lines.push(`- ${item.name}`);
    }

    lines.push("");
    lines.push("Possible matches:");

    for (const item of notFound) {
      const suggestion = suggestionMap.get(item.name);
      lines.push(`- ${item.name} \u2192 ${suggestion || "no close match found"}`);
    }
  }

  if (lowStock.length > 0) {
    lines.push("");
    lines.push("\u26A0\uFE0F Running low:");

    for (const item of lowStock) {
      lines.push(`- ${item.name}: only ${item.newQty} left`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  buildConfirmationMessage,
};
