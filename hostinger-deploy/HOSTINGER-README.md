# APS Enterprise — Hostinger deployment

This bundle contains the production source for the React frontend and Express API. It intentionally excludes secrets, `node_modules`, tests, logs, local build output, Docker files, and development scripts.

## Hostinger settings

- Framework: React/Vite or Other Node.js application
- Node.js: 20, 22, or 24
- Build command: `npm run build`
- Start command: `npm start`
- Port: use Hostinger's assigned port; the app reads `PORT` (the example uses 3000)
- Root directory: the directory containing this `package.json`

Add the environment variables from `.env.example` in Hostinger's environment-variable panel. Never upload a real `.env` file.

Production requires a strong `JWT_SECRET`, the existing `ADMIN_EMAIL` and
`ADMIN_PASSWORD`, a working `DATABASE_URL`, and the exact deployed origin in
`CORS_ORIGINS`/`APP_ORIGIN`. Configure `WHATSAPP_WEBHOOK_SECRET` (or
`META_APP_SECRET`) before enabling WhatsApp webhooks; unsigned webhook POSTs
are rejected in production.

## Database

This app is designed for PostgreSQL. Set `DATABASE_URL` to a hosted PostgreSQL connection string and set `DATABASE_SSL=true` when required by the provider. A cPanel MySQL database is not a drop-in replacement.

## Domain

Deploy first to a temporary Hostinger URL. After `/api/health` responds, add the custom domain in Hostinger and create the DNS record it shows in GoDaddy. Keep the existing GoDaddy nameservers if you want GoDaddy to continue managing email and DNS.
