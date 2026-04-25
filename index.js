require("dotenv").config();

const openai = require("./services/openai");
const whatsapp = require("./services/whatsapp");
const supabase = require("./services/supabase");
const metaMedia = require("./services/metaMedia");
const voiceHandler = require("./handlers/voice");
const textHandler = require("./handlers/text");
const summaryHandler = require("./handlers/summary");

function start() {
  const port = process.env.PORT || 3000;
  console.log(`ShopMate MVP scaffold ready on port ${port}`);
}

if (require.main === module) {
  start();
}

module.exports = {
  start,
  services: {
    openai,
    whatsapp,
    supabase,
    metaMedia,
  },
  handlers: {
    voice: voiceHandler,
    text: textHandler,
    summary: summaryHandler,
  },
};
