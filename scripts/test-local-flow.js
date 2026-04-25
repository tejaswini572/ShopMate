require("dotenv").config();

const fakeParsed = {
  customer: null,
  items: [
    { name: "Soap", qty: 3 },
    { name: "Pepsi", qty: 5 },
    { name: "Rice bag 5kg", qty: 1 },
  ],
};

function buildReply(results) {
  const updated = results.filter((item) => !item.error);
  const lowStock = updated.filter((item) => Number(item.newQty) <= Number(item.minStock));
  const notFound = results.filter((item) => item.error === "not found");

  const lines = ["✅ Stock updated!"];

  for (const item of updated) {
    lines.push(`· ${item.name}: sold ${item.sold} → ${item.newQty} left`);
  }

  if (lowStock.length > 0) {
    lines.push("");
    lines.push("⚠️ Running low:");

    for (const item of lowStock) {
      lines.push(`· ${item.name}: only ${item.newQty} left`);
    }
  }

  if (notFound.length > 0) {
    lines.push("");
    lines.push("Could not find:");

    for (const item of notFound) {
      lines.push(`· ${item.name}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.log("Supabase env vars missing. Fill SUPABASE_URL and SUPABASE_KEY in .env.");
    return;
  }

  const { updateStock } = require("../services/supabase");
  const results = await updateStock(fakeParsed.items);
  const reply = buildReply(results);

  console.log(reply);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Local flow test failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildReply,
  fakeParsed,
  main,
};
