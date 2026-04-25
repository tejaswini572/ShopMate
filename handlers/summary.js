const { getTodaySalesSummary, getLowStockItems } = require("../services/supabase");
const { sendWhatsApp } = require("../services/whatsapp");
const { formatBilingualSections } = require("./bilingual");

function formatCurrency(value) {
  return `\u20B9${Number(value || 0).toFixed(2)}`;
}

function buildSalesSection(summary) {
  const items = Array.isArray(summary?.items) ? summary.items : [];
  const enLines = ["Sales:"];
  const mlLines = ["\u0d35\u0d3f\u0d7d\u0d2a\u0d4d\u0d2a\u0d28:"];

  if (items.length === 0) {
    enLines.push("No sales logged yet today.", "", "Total items sold: 0", `Estimated revenue: ${formatCurrency(0)}`, `Estimated profit: ${formatCurrency(0)}`);
    mlLines.push("\u0d07\u0d28\u0d4d\u0d28\u0d4d \u0d07\u0d24\u0d41\u0d35\u0d30\u0d46 \u0d35\u0d3f\u0d7d\u0d2a\u0d4d\u0d2a\u0d28 \u0d30\u0d47\u0d16\u0d2a\u0d4d\u0d2a\u0d46\u0d1f\u0d41\u0d24\u0d4d\u0d24\u0d3f\u0d2f\u0d3f\u0d1f\u0d4d\u0d1f\u0d3f\u0d32\u0d4d\u0d32.", "", "\u0d06\u0d15\u0d46 \u0d35\u0d3f\u0d31\u0d4d\u0d31 \u0d38\u0d3e\u0d27\u0d28\u0d19\u0d4d\u0d19\u0d7e: 0", `\u0d0f\u0d15\u0d26\u0d47\u0d36 \u0d35\u0d30\u0d41\u0d2e\u0d3e\u0d28\u0d02: ${formatCurrency(0)}`, `\u0d0f\u0d15\u0d26\u0d47\u0d36 \u0d32\u0d3e\u0d2d\u0d02: ${formatCurrency(0)}`);
    return formatBilingualSections(enLines, mlLines);
  }

  for (const item of items) {
    enLines.push(`- ${item.name}: ${item.qtySold} sold`);
    mlLines.push(`- ${item.name}: ${item.qtySold} \u0d35\u0d3f\u0d31\u0d4d\u0d31\u0d41`);
  }

  enLines.push("", `Total items sold: ${Number(summary?.totalQtySold || 0)}`, `Estimated revenue: ${formatCurrency(summary?.estimatedRevenue)}`, `Estimated profit: ${formatCurrency(summary?.estimatedProfit)}`);
  mlLines.push("", `\u0d06\u0d15\u0d46 \u0d35\u0d3f\u0d31\u0d4d\u0d31 \u0d38\u0d3e\u0d27\u0d28\u0d19\u0d4d\u0d19\u0d7e: ${Number(summary?.totalQtySold || 0)}`, `\u0d0f\u0d15\u0d26\u0d47\u0d36 \u0d35\u0d30\u0d41\u0d2e\u0d3e\u0d28\u0d02: ${formatCurrency(summary?.estimatedRevenue)}`, `\u0d0f\u0d15\u0d26\u0d47\u0d36 \u0d32\u0d3e\u0d2d\u0d02: ${formatCurrency(summary?.estimatedProfit)}`);

  return formatBilingualSections(enLines, mlLines);
}

function buildLowStockSection(lowStockItems) {
  const items = Array.isArray(lowStockItems) ? lowStockItems : [];
  const enLines = ["Low stock:"];
  const mlLines = ["\u0d38\u0d4d\u0d31\u0d4b\u0d15\u0d4d\u0d15\u0d4d \u0d15\u0d41\u0d31\u0d35\u0d4d:"];

  if (items.length === 0) {
    enLines.push("\u2705 No low-stock items.");
    mlLines.push("\u2705 \u0d38\u0d4d\u0d31\u0d4b\u0d15\u0d4d\u0d15\u0d4d \u0d15\u0d41\u0d31\u0d35\u0d41\u0d33\u0d4d\u0d33 \u0d38\u0d3e\u0d27\u0d28\u0d19\u0d4d\u0d19\u0d33\u0d3f\u0d32\u0d4d\u0d32.");
    return formatBilingualSections(enLines, mlLines);
  }

  for (const item of items) {
    enLines.push(`- ${item.name}: ${item.quantity} left`);
    mlLines.push(`- ${item.name}: ${item.quantity} \u0d2c\u0d3e\u0d15\u0d4d\u0d15\u0d3f`);
  }

  return formatBilingualSections(enLines, mlLines);
}

function buildSummaryMessage(summary, lowStockItems) {
  return [
    formatBilingualSections(["Today's ShopMate Summary"], ["\u0d07\u0d28\u0d4d\u0d28\u0d24\u0d4d\u0d24\u0d46 ShopMate \u0d38\u0d02\u0d17\u0d4d\u0d30\u0d39\u0d02"]),
    "",
    buildSalesSection(summary),
    "",
    buildLowStockSection(lowStockItems),
  ].join("\n");
}

async function handleSummaryMessage(from) {
  try {
    const [salesSummary, lowStockItems] = await Promise.all([
      getTodaySalesSummary(),
      getLowStockItems(),
    ]);

    const message = buildSummaryMessage(salesSummary, lowStockItems);
    return await sendWhatsApp(from, message);
  } catch (error) {
    console.error("[summary] Failed to send summary:", error.message);
    const fallbackMessage = buildSummaryMessage(
      { items: [], estimatedRevenue: 0, estimatedProfit: 0, totalQtySold: 0 },
      []
    );
    return sendWhatsApp(from, fallbackMessage);
  }
}

async function handleSummaryCommand(from) {
  return handleSummaryMessage(from);
}

module.exports = {
  handleSummaryMessage,
  handleSummaryCommand,
};
