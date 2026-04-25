const { getTodaySalesSummary, getLowStockItems } = require("../services/supabase");
const { sendWhatsApp } = require("../services/whatsapp");

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function buildSalesSection(summary) {
  const items = Array.isArray(summary?.items) ? summary.items : [];

  if (items.length === 0) {
    return ["Sales:", "No sales logged yet today.", "", `Estimated revenue: ${formatCurrency(0)}`];
  }

  const lines = ["Sales:"];

  for (const item of items) {
    lines.push(`· ${item.name}: ${item.qtySold} sold`);
  }

  lines.push("");
  lines.push(`Estimated revenue: ${formatCurrency(summary?.estimatedRevenue)}`);

  return lines;
}

function buildLowStockSection(lowStockItems) {
  const items = Array.isArray(lowStockItems) ? lowStockItems : [];
  const lines = ["Low stock:"];

  if (items.length === 0) {
    lines.push("✅ No low-stock items.");
    return lines;
  }

  for (const item of items) {
    lines.push(`· ${item.name}: ${item.quantity} left`);
  }

  return lines;
}

function buildSummaryMessage(summary, lowStockItems) {
  return [
    "Today's ShopMate Summary",
    "",
    ...buildSalesSection(summary),
    "",
    ...buildLowStockSection(lowStockItems),
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
      { items: [], estimatedRevenue: 0, totalQtySold: 0 },
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
