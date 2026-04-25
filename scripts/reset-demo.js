require("dotenv").config();

const { resetDemoStock } = require("../services/supabase");

async function main() {
  await resetDemoStock();
  console.log("✅ Demo stock reset complete");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Demo stock reset failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
};
