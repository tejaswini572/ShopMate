try {
  require("dotenv").config();
} catch (error) {
  console.error("[test-undo] Failed to load dotenv:", error.message);
}

const { findProductByName, undoLastSale, updateStock } = require("../services/supabase");

async function main() {
  const before = await findProductByName("Soap");
  const beforeQty = Number(before?.quantity || 0);
  console.log("Soap quantity before sale:", beforeQty);

  const saleResult = await updateStock([{ name: "Soap", qty: 1 }]);
  console.log("Sale result:", saleResult);
  console.log("Batch ID:", saleResult?.[0]?.batchId || null);

  const afterSale = await findProductByName("Soap");
  console.log("Soap quantity after sale:", Number(afterSale?.quantity || 0));

  const undoResult = await undoLastSale();
  console.log("Undo result:", undoResult);

  const afterUndo = await findProductByName("Soap");
  const afterUndoQty = Number(afterUndo?.quantity || 0);
  console.log("Soap quantity after undo:", afterUndoQty);
  console.log("Undo restored original quantity:", afterUndoQty === beforeQty);
}

main().catch((error) => {
  console.error("[test-undo] Failed:", error.message);
  process.exit(1);
});
