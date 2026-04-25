const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  try {
    require("dotenv").config();
  } catch (error) {
    console.error("[supabase] Failed to load dotenv:", error.message);
  }
}

const DEMO_PRODUCTS = [
  { name: "Soap", quantity: 18, unit: "piece", min_stock: 6, buy_price: 28, sell_price: 35 },
  { name: "Rice bag 5kg", quantity: 6, unit: "bag", min_stock: 5, buy_price: 245, sell_price: 280 },
  { name: "Coconut Oil 500ml", quantity: 9, unit: "bottle", min_stock: 4, buy_price: 180, sell_price: 210 },
  { name: "Pepsi 250ml", quantity: 24, unit: "bottle", min_stock: 8, buy_price: 18, sell_price: 25 },
  { name: "Surf Excel 1kg", quantity: 7, unit: "packet", min_stock: 4, buy_price: 205, sell_price: 235 },
  { name: "Sugar 1kg", quantity: 14, unit: "packet", min_stock: 5, buy_price: 42, sell_price: 48 },
  { name: "Tea powder 100g", quantity: 11, unit: "packet", min_stock: 4, buy_price: 52, sell_price: 62 },
  { name: "Aval Rice flakes", quantity: 10, unit: "packet", min_stock: 4, buy_price: 38, sell_price: 45 },
  { name: "Maggi noodles", quantity: 30, unit: "packet", min_stock: 10, buy_price: 11, sell_price: 14 },
  { name: "Parle-G Biscuit", quantity: 26, unit: "packet", min_stock: 8, buy_price: 8, sell_price: 10 },
  { name: "Ghee 500ml", quantity: 4, unit: "bottle", min_stock: 3, buy_price: 310, sell_price: 355 },
  { name: "Atta 5kg", quantity: 8, unit: "bag", min_stock: 4, buy_price: 215, sell_price: 250 },
  { name: "Salt 1kg", quantity: 16, unit: "packet", min_stock: 5, buy_price: 16, sell_price: 20 },
  { name: "Turmeric 100g", quantity: 12, unit: "packet", min_stock: 4, buy_price: 24, sell_price: 30 },
  { name: "Mustard oil 1L", quantity: 6, unit: "bottle", min_stock: 3, buy_price: 155, sell_price: 180 },
  { name: "Horlicks 200g", quantity: 5, unit: "jar", min_stock: 4, buy_price: 145, sell_price: 170 },
  { name: "Chilli powder 100g", quantity: 9, unit: "packet", min_stock: 4, buy_price: 36, sell_price: 44 },
  { name: "Candle", quantity: 20, unit: "piece", min_stock: 6, buy_price: 8, sell_price: 12 },
  { name: "Pen", quantity: 25, unit: "piece", min_stock: 10, buy_price: 6, sell_price: 10 },
  { name: "Notebook", quantity: 15, unit: "piece", min_stock: 5, buy_price: 32, sell_price: 40 },
];

function createSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.error("[supabase] Missing SUPABASE_URL or SUPABASE_KEY.");
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const supabase = createSupabase();

function missingEnvResult(fallback) {
  return fallback;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeProductName(value) {
  return normalizeName(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeLike(value) {
  return value.replace(/[%_]/g, "\\$&");
}

function levenshteinDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");

  if (left === right) {
    return 0;
  }

  if (!left) {
    return right.length;
  }

  if (!right) {
    return left.length;
  }

  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= right.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function tokenizeName(value) {
  return normalizeProductName(value)
    .split(" ")
    .filter(Boolean);
}

function getTokenOverlapScore(inputName, productName) {
  const inputTokens = tokenizeName(inputName);
  const productTokens = tokenizeName(productName);

  if (inputTokens.length === 0 || productTokens.length === 0) {
    return 0;
  }

  const productTokenSet = new Set(productTokens);
  let overlapCount = 0;

  for (const token of inputTokens) {
    if (productTokenSet.has(token)) {
      overlapCount += 1;
    }
  }

  return overlapCount / Math.max(inputTokens.length, productTokens.length);
}

function getSimilarityScore(inputName, productName) {
  const normalizedInput = normalizeProductName(inputName);
  const normalizedProduct = normalizeProductName(productName);

  if (!normalizedInput || !normalizedProduct) {
    return 0;
  }

  if (normalizedInput === normalizedProduct) {
    return 1;
  }

  let score = 0;

  if (
    normalizedProduct.includes(normalizedInput) ||
    normalizedInput.includes(normalizedProduct)
  ) {
    score = Math.max(score, 0.9);
  }

  const tokenScore = getTokenOverlapScore(normalizedInput, normalizedProduct);
  score = Math.max(score, tokenScore * 0.75);

  const distance = levenshteinDistance(normalizedInput, normalizedProduct);
  const maxLength = Math.max(normalizedInput.length, normalizedProduct.length);
  const levenshteinScore = maxLength > 0 ? 1 - distance / maxLength : 0;
  score = Math.max(score, levenshteinScore);

  const inputCompact = normalizedInput.replace(/\s+/g, "");
  const productCompact = normalizedProduct.replace(/\s+/g, "");
  const compactDistance = levenshteinDistance(inputCompact, productCompact);
  const compactLength = Math.max(inputCompact.length, productCompact.length);
  const compactScore = compactLength > 0 ? 1 - compactDistance / compactLength : 0;
  score = Math.max(score, compactScore);

  return score;
}

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function getAllStock() {
  if (!supabase) {
    return missingEnvResult([]);
  }

  const { data, error } = await supabase
    .from("stock")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[supabase] getAllStock failed:", error.message);
    return [];
  }

  return data || [];
}

async function suggestProductMatches(unknownNames) {
  const names = Array.isArray(unknownNames) ? unknownNames : [];

  if (names.length === 0) {
    return [];
  }

  console.log(`Product suggestion requested for: ${names.join(", ")}`);

  const stockItems = await getAllStock();
  const candidateItems = Array.isArray(stockItems) && stockItems.length > 0
    ? stockItems
    : DEMO_PRODUCTS;
  if (!Array.isArray(candidateItems) || candidateItems.length === 0) {
    return names.map((input) => ({
      input,
      suggestion: null,
    }));
  }

  const results = names.map((input) => {
    let bestSuggestion = null;
    let bestScore = 0;

    for (const stockItem of candidateItems) {
      const candidateName = String(stockItem?.name || "").trim();
      const score = getSimilarityScore(input, candidateName);

      if (score > bestScore) {
        bestScore = score;
        bestSuggestion = candidateName;
      }
    }

    return {
      input,
      suggestion: bestScore >= 0.45 ? bestSuggestion : null,
    };
  });

  for (const item of results) {
    console.log(`Product suggestion result: ${item.input} -> ${item.suggestion || "no close match found"}`);
  }

  return results;
}

async function findProductByName(name) {
  if (!supabase) {
    return null;
  }

  const queryName = String(name || "").trim();
  if (!queryName) {
    return null;
  }

  const normalized = normalizeName(queryName);

  const { data: exactRows, error: exactError } = await supabase
    .from("stock")
    .select("*")
    .ilike("name", queryName);

  if (exactError) {
    console.error("[supabase] findProductByName exact match failed:", exactError.message);
  } else if (exactRows && exactRows.length > 0) {
    const exactMatch = exactRows.find((row) => normalizeName(row.name) === normalized) || exactRows[0];
    return exactMatch;
  }

  const { data: partialRows, error: partialError } = await supabase
    .from("stock")
    .select("*")
    .ilike("name", `%${escapeLike(queryName)}%`);

  if (partialError) {
    console.error("[supabase] findProductByName partial match failed:", partialError.message);
    return null;
  }

  if (!partialRows || partialRows.length === 0) {
    return null;
  }

  return partialRows[0];
}

async function updateStock(items) {
  if (!supabase) {
    return missingEnvResult([]);
  }

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = [];

  for (const item of items) {
    const name = String(item?.name || "").trim();
    const requestedQty = Number(item?.qty);

    if (!name || !Number.isFinite(requestedQty) || requestedQty <= 0) {
      results.push({
        name: item?.name || "",
        sold: item?.qty || 0,
        error: "invalid input",
      });
      continue;
    }

    const product = await findProductByName(name);

    if (!product) {
      results.push({
        name,
        sold: requestedQty,
        error: "not found",
      });
      continue;
    }

    const oldQty = Number(product.quantity || 0);
    const soldQty = Math.min(oldQty, requestedQty);
    const newQty = oldQty - soldQty;

    if (soldQty > 0) {
      const { error: updateError } = await supabase
        .from("stock")
        .update({
          quantity: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (updateError) {
        console.error(`[supabase] Failed to update stock for ${product.name}:`, updateError.message);
        results.push({
          name: product.name,
          sold: soldQty,
          error: "update failed",
        });
        continue;
      }

      const { error: salesLogError } = await supabase
        .from("sales_log")
        .insert({
          product_name: product.name,
          qty_sold: soldQty,
          sell_price: product.sell_price,
        });

      if (salesLogError) {
        console.error(`[supabase] Failed to insert sales log for ${product.name}:`, salesLogError.message);
      }
    }

    results.push({
      name: product.name,
      sold: soldQty,
      requestedQty,
      oldQty,
      newQty,
      minStock: Number(product.min_stock || 0),
      sellPrice: Number(product.sell_price || 0),
    });
  }

  return results;
}

async function getLowStockItems() {
  if (!supabase) {
    return missingEnvResult([]);
  }

  const { data, error } = await supabase
    .from("stock")
    .select("*")
    .order("quantity", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[supabase] getLowStockItems failed:", error.message);
    return [];
  }

  return (data || []).filter((item) => Number(item.quantity || 0) <= Number(item.min_stock || 0));
}

async function getTodaySalesSummary() {
  if (!supabase) {
    return missingEnvResult({
      items: [],
      totalQtySold: 0,
      estimatedRevenue: 0,
      estimatedProfit: 0,
    });
  }

  const { start, end } = getTodayBounds();

  const { data, error } = await supabase
    .from("sales_log")
    .select("product_name, qty_sold, sell_price, sold_at")
    .gte("sold_at", start)
    .lt("sold_at", end)
    .order("sold_at", { ascending: false });

  if (error) {
    console.error("[supabase] getTodaySalesSummary failed:", error.message);
    return {
      items: [],
      totalQtySold: 0,
      estimatedRevenue: 0,
      estimatedProfit: 0,
    };
  }

  const stockItems = await getAllStock();
  const productCatalog = Array.isArray(stockItems) && stockItems.length > 0 ? stockItems : DEMO_PRODUCTS;
  const productMap = new Map(productCatalog.map((item) => [normalizeName(item.name), item]));

  const grouped = new Map();
  let totalQtySold = 0;
  let estimatedRevenue = 0;
  let estimatedProfit = 0;

  for (const row of data || []) {
    const key = row.product_name || "Unknown";
    const qty = Number(row.qty_sold || 0);
    const price = Number(row.sell_price || 0);
    const product = productMap.get(normalizeName(key));
    const buyPrice = Number(product?.buy_price || 0);

    totalQtySold += qty;
    estimatedRevenue += qty * price;
    estimatedProfit += qty * (price - buyPrice);

    if (!grouped.has(key)) {
      grouped.set(key, {
        name: key,
        qtySold: 0,
        revenue: 0,
        profit: 0,
      });
    }

    const item = grouped.get(key);
    item.qtySold += qty;
    item.revenue += qty * price;
    item.profit += qty * (price - buyPrice);
  }

  return {
    items: Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name)),
    totalQtySold,
    estimatedRevenue,
    estimatedProfit,
  };
}

async function resetDemoStock() {
  if (!supabase) {
    return missingEnvResult([]);
  }

  const names = DEMO_PRODUCTS.map((item) => item.name);

  const { error: deleteError } = await supabase
    .from("stock")
    .delete()
    .in("name", names);

  if (deleteError) {
    console.error("[supabase] resetDemoStock delete failed:", deleteError.message);
    return [];
  }

  const rows = DEMO_PRODUCTS.map((item) => ({
    ...item,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("stock")
    .insert(rows)
    .select();

  if (error) {
    console.error("[supabase] resetDemoStock insert failed:", error.message);
    return [];
  }

  return (data || []).sort((a, b) => a.name.localeCompare(b.name));
}

async function getStockSummary() {
  return getTodaySalesSummary();
}

module.exports = {
  getAllStock,
  findProductByName,
  suggestProductMatches,
  updateStock,
  getLowStockItems,
  getTodaySalesSummary,
  resetDemoStock,
  getStockSummary,
};
