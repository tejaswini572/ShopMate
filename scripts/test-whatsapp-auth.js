try {
  require("dotenv").config();
} catch (error) {
  console.error("[test-whatsapp-auth] Failed to load dotenv:", error.message);
}

const { verifyWhatsAppAuth } = require("../services/whatsapp");

async function main() {
  const result = await verifyWhatsAppAuth();
  console.log("WhatsApp auth check result:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[test-whatsapp-auth] Failed:", error.message);
  process.exit(1);
});
