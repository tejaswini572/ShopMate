# ShopMate — WhatsApp Kirana Stock Assistant

ShopMate is a WhatsApp-only stock assistant for kirana stores.

## MVP Features

- WhatsApp receives voice/text sales update
- OpenAI extracts product and quantity
- Supabase stock updates
- WhatsApp confirmation reply
- Low-stock warning
- Summary command

## Architecture

```text
WhatsApp → Express Webhook → OpenAI → Supabase → WhatsApp Reply
```

## Team Split

- Person A: AI + webhook
- Person B: database + WhatsApp sender
- Person C: integration + demo

## Windows Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

## Supabase Setup

- Create Supabase project
- Run `sql/schema.sql`
- Run `sql/seed.sql`
- Copy `SUPABASE_URL` and `SUPABASE_KEY` into `.env`

## Meta WhatsApp Setup

- Create Meta Developer app
- Add WhatsApp product
- Copy access token
- Copy phone number ID
- Set webhook callback URL:

```text
https://YOUR_NGROK_URL/webhook
```

- Verify token:

```text
shopmate123
```

## ngrok + Meta Webhook Setup On Windows

Start the server in PowerShell:

```powershell
npm run dev
```

Open another PowerShell window and start ngrok:

```powershell
ngrok http 3000
```

Copy the HTTPS forwarding URL.

In Meta Developer Dashboard:

- Go to WhatsApp configuration
- Callback URL:

```text
https://YOUR_NGROK_URL/webhook
```

- Verify token: same as `WEBHOOK_VERIFY_TOKEN` in `.env`
- Subscribe to `messages` webhook field

Important: if ngrok restarts, the URL changes. Update the Meta webhook URL again.

## Local Test

```powershell
npm run test:local
```

## Demo Flow

- Send text: `3 soap, 5 Pepsi sold`
- Send voice note with same sale
- Send: `?`
- See summary

## Windows Troubleshooting

- Use `curl.exe` instead of `curl`
- Use `Copy-Item` instead of `cp`
- Use `New-Item` instead of `touch`
- If PowerShell blocks scripts, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## General Troubleshooting

- OpenAI mock mode still on
- WhatsApp mock mode still on
- Supabase env missing
- ngrok URL changed
- webhook verification failed
