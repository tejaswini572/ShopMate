try {
  require("dotenv").config();
} catch (error) {
  console.error("[test-suggestions] Failed to load dotenv:", error.message);
}

const { suggestProductMatches } = require("../services/supabase");

async function main() {
  const inputs = ["Noteboo", "notebok", "cocunut oil", "parleg", "pepsi", "rice"];
  const suggestions = await suggestProductMatches(inputs);

  console.log("Suggestion test results:");
  for (const item of suggestions) {
    console.log(`- ${item.input} -> ${item.suggestion || "no close match found"}`);
  }
}

main().catch((error) => {
  console.error("[test-suggestions] Failed:", error.message);
  process.exit(1);
});
