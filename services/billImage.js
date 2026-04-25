const fs = require("fs");
const path = require("path");
const { Jimp, loadFont } = require("jimp");
const { SANS_16_BLACK, SANS_32_BLACK } = require("jimp/fonts");

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

function formatAmountText(value) {
  return formatRupees(value).replace(/^\u20B9/, "");
}

function formatTimestamp(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("en-IN");
  }

  return date.toLocaleString("en-IN");
}

function ensureTmpDir() {
  const tmpDir = path.join(process.cwd(), "tmp");

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  return tmpDir;
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function drawHorizontalLine(image, x, y, width, color) {
  for (let offset = 0; offset < width; offset += 1) {
    image.setPixelColor(color, x + offset, y);
  }
}

function drawVerticalLine(image, x, y, height, color) {
  for (let offset = 0; offset < height; offset += 1) {
    image.setPixelColor(color, x, y + offset);
  }
}

function drawDiagonalLine(image, startX, startY, length, color) {
  for (let offset = 0; offset < length; offset += 1) {
    image.setPixelColor(color, startX + offset, startY + offset);
    image.setPixelColor(color, startX + offset + 1, startY + offset);
  }
}

function createRupeeIcon() {
  const icon = new Jimp({ width: 14, height: 18, color: 0x00000000 });
  const black = 0x000000ff;

  drawHorizontalLine(icon, 1, 1, 10, black);
  drawHorizontalLine(icon, 1, 5, 9, black);
  drawVerticalLine(icon, 8, 1, 5, black);
  drawDiagonalLine(icon, 3, 6, 8, black);

  return icon;
}

function drawCurrencyValue(image, font, x, y, value, rupeeIcon) {
  image.composite(rupeeIcon, x, y + 2);
  image.print({
    font,
    x: x + 16,
    y,
    text: formatAmountText(value),
  });
}

async function generateBillImage({ customerPhone, items, total, timestamp }) {
  const billItems = Array.isArray(items) ? items : [];
  const safeTimestamp = timestamp || new Date().toISOString();
  const tmpDir = ensureTmpDir();
  const width = 900;
  const rowHeight = 36;
  const headerHeight = 180;
  const footerHeight = 90;
  const tableHeaderHeight = 30;
  const itemAreaHeight = Math.max(1, billItems.length) * rowHeight;
  const height = headerHeight + tableHeaderHeight + itemAreaHeight + footerHeight;
  const filePath = path.join(tmpDir, `bill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`);

  const [titleFont, bodyFont] = await Promise.all([
    loadFont(SANS_32_BLACK),
    loadFont(SANS_16_BLACK),
  ]);

  const image = new Jimp({ width, height, color: 0xffffffff });
  const rupeeIcon = createRupeeIcon();

  image.print({ font: titleFont, x: 40, y: 30, text: "ShopMate" });
  image.print({ font: bodyFont, x: 40, y: 78, text: "Sales Bill" });
  image.print({ font: bodyFont, x: 40, y: 108, text: `Date: ${formatTimestamp(safeTimestamp)}` });

  if (customerPhone) {
    image.print({ font: bodyFont, x: 40, y: 132, text: `Customer: ${customerPhone}` });
  }

  const headerY = 180;
  image.print({ font: bodyFont, x: 40, y: headerY, text: "Item" });
  image.print({ font: bodyFont, x: 500, y: headerY, text: "Qty" });
  image.print({ font: bodyFont, x: 600, y: headerY, text: "Rate" });
  image.print({ font: bodyFont, x: 730, y: headerY, text: "Total" });

  let currentY = headerY + 30;

  for (const item of billItems) {
    const sold = Number(item?.sold || 0);
    const sellPrice = Number(item?.sellPrice || 0);
    const lineTotal = sold * sellPrice;

    image.print({ font: bodyFont, x: 40, y: currentY, text: truncateText(item?.name, 28) });
    image.print({ font: bodyFont, x: 500, y: currentY, text: String(sold) });
    drawCurrencyValue(image, bodyFont, 600, currentY, sellPrice, rupeeIcon);
    drawCurrencyValue(image, bodyFont, 730, currentY, lineTotal, rupeeIcon);

    currentY += rowHeight;
  }

  image.print({ font: bodyFont, x: 40, y: currentY + 10, text: "Grand Total:" });
  drawCurrencyValue(image, bodyFont, 180, currentY + 10, total, rupeeIcon);
  image.print({ font: bodyFont, x: 40, y: currentY + 40, text: "Thank you" });

  await image.write(filePath);

  return filePath;
}

module.exports = {
  generateBillImage,
};
