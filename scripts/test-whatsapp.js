require("dotenv").config();

const { sendWhatsApp } = require("../services/whatsapp");

async function main() {
  const number = process.argv[2];

  if (!number) {
    console.log("Usage:");
    console.log("node scripts/test-whatsapp.js 91XXXXXXXXXX");
    process.exit(1);
  }

  const result = await sendWhatsApp(number, "ShopMate is alive ");
  console.log(result);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[test-whatsapp] Failed:", error.message);
    process.exit(1);
  });
}

module.exports = {
  main,
};
