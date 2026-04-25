require("dotenv").config();

const { handleTextMessage } = require("../handlers/text");

async function main() {
  const input = process.argv.slice(2).join(" ").trim() || "order";
  process.env.WHATSAPP_MOCK = "true";

  await handleTextMessage("919999999999", input);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[test-order] Failed:", error.message);
    process.exit(1);
  });
}

module.exports = {
  main,
};
