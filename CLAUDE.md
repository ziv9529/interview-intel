# Interview Intel IL

Personal knowledge base of how Israeli tech companies interview in 2026.
Captures come in through a Telegram bot, an LLM extracts structured
Insights, and Briefs are generated per company or role.

## Read first
- GLOSSARY.md: use these terms exactly (Capture, Insight, Brief...)
- docs/design.md: system design and roadmap
- docs/adr/: decisions already made; do not relitigate without asking

## Stack
TypeScript, pnpm workspaces, Cloudflare Workers, Postgres (Supabase),
Drizzle, Zod, Claude API (Haiku for extraction, Sonnet for briefs).

## Rules
- A Capture is saved before extraction and never mutated (ADR-0002).
- Any change to a prompt, schema or model runs the eval suite first.
  Report the score before and after; it must not drop below main.
- Tests go at two seams only: extract(capture) and the webhook handler,
  against PGlite.
- One ticket per session. Keep diffs small. Ask before adding a dependency.
- No automated scraping of LinkedIn or Glassdoor. Manual capture only.
- Secrets live in .dev.vars / Worker secrets, never in code or shell env.
- After each ticket, add one line to docs/journal.md.

## UI work (apps/web)
- Use the emil-design-eng and better-ui skills for every UI change.
- Use design-taste-frontend only for the marketing landing page.
- Clean, quiet, modern: generous spacing, one accent colour,
  typography carries hierarchy.
- Hebrew and RTL by default. Light and dark from the first screen.
- Motion is short and purposeful; respect prefers-reduced-motion.
- Every claim on screen shows its Source and Credibility.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for ziv9529/interview-intel, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
