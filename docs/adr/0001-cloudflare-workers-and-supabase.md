# Cloudflare Workers for compute, Supabase for data

The bot runs as a Cloudflare Worker (webhook, commands, cron) and stores everything in Supabase (Postgres + Storage), reached through Hyperdrive or the pooled connection string. All-in-Supabase (Edge Functions + pg_cron) would mean one vendor fewer, but Workers lets the webhook reply to Telegram instantly and run extraction in `ctx.waitUntil`, and Workers experience is worth more in the job market this project serves. The hourly cron is a safety net for failed extractions, not the main path.
