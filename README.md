# Covenant

Be your own inscriptions marketplace

## Config

- `config/store.yml`: runtime config (theme, Electrs API URL, artist metadata)
- `config/policy.yml`: selling, pricing, `payment_address`, `optional_payments`

## Local

```bash
npm install
printf "SELLING_WALLET_PRIVATE_KEY=...\n" > .dev.vars.signing-agent
: > .dev.vars.app
npx wrangler@latest d1 migrations apply covenant --local
npm run dev:signing-agent
npm run dev
```

Optional (second terminal):

```bash
npm run dev:watch
```

Trigger a scheduled run in the browser (scheduled crons must be enabled via `npm run dev`):

- `http://localhost:8787/__scheduled`

## Production

```bash
npx wrangler@latest d1 create covenant
npx wrangler@latest d1 list
npx wrangler@latest d1 migrations apply covenant --remote
npx wrangler@latest secret put SELLING_WALLET_PRIVATE_KEY --config wrangler.signing-agent.toml
npm run deploy:signing-agent
npm run deploy
```

Ensure the D1 `database_id` in both `wrangler.toml` and `wrangler.signing-agent.toml` matches the database you created.

## Crons

Configured in `wrangler.toml` (orders every 5 min, sync every 10 min).
