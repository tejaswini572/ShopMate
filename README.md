# ShopMate MVP

ShopMate is a WhatsApp-only kirana stock assistant.

## MVP Scope

- WhatsApp receives voice/text sales update
- OpenAI extracts product and quantity
- Supabase stock updates
- WhatsApp confirmation reply
- Low-stock warning
- Summary command

## Project Structure

- `index.js` - application entry point
- `services/openai.js` - OpenAI integration placeholder
- `services/whatsapp.js` - WhatsApp integration placeholder
- `services/supabase.js` - Supabase integration placeholder
- `services/metaMedia.js` - Meta media integration placeholder
- `handlers/voice.js` - voice message handler placeholder
- `handlers/text.js` - text message handler placeholder
- `handlers/summary.js` - summary command handler placeholder
- `sql/schema.sql` - database schema placeholder
- `sql/seed.sql` - seed data placeholder
- `scripts/test-local-flow.js` - local scaffold check
- `scripts/test-whatsapp.js` - WhatsApp scaffold check
- `scripts/reset-demo.js` - demo reset placeholder

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` with local demo credentials when integrations are implemented.

## Scripts

```bash
npm run start
npm run dev
npm run test:local
npm run test:whatsapp
npm run reset:demo
```

Business logic is intentionally not implemented yet.
