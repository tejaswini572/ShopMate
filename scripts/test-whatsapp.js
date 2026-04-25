const whatsapp = require("../services/whatsapp");

function main() {
  console.log("WhatsApp scaffold check passed.");
  console.log("Available WhatsApp exports:", Object.keys(whatsapp).join(", "));
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
