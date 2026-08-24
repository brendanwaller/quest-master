# Deploying Quest Master

The app is a static Vite build (no backend), but its frontier GM calls OpenRouter.
**Do NOT deploy the production bundle as-is with `VITE_OPENROUTER_API_KEY` set** — the
key gets inlined into the JS and anyone can extract and spend on it. Use the
worker proxy so the key stays server-side.

## Architecture

```
Browser (static app)
   │  POST /api/v1/chat/completions  (no key in the request)
   ▼
Cloudflare Worker  (worker/proxy.ts, holds OPENROUTER_API_KEY)
   │  injects Authorization header
   ▼
OpenRouter (stealth/ox-alpha)
```

The frontend calls the worker when `VITE_OPENROUTER_PROXY` is set. Locally, with
no proxy and a real `VITE_OPENROUTER_API_KEY`, it calls OpenRouter directly.
With neither, it runs on the built-in offline engine (no frontier, never breaks).

## 1. Deploy the proxy worker (Cloudflare)

```bash
cd quest-master
npm i -D wrangler
npx wrangler login            # opens browser OAuth once
npx wrangler deploy           # deploys worker/proxy.ts -> your-worker-name
npx wrangler secret put OPENROUTER_API_KEY   # paste your OpenRouter key
```

Note the worker URL: `https://<your-worker-name>.<subdomain>.workers.dev`.

## 2. Build the static site for a deploy WITHOUT leaking the key

Do NOT set `VITE_OPENROUTER_API_KEY` in the build env. Instead:

```bash
cd quest-master
VITE_OPENROUTER_PROXY="https://<your-worker-name>.<subdomain>.workers.dev" \
  npm run build
# verify the key is NOT in the bundle:
grep -rl "sk-or-v1" dist/assets/ || echo "CLEAN: no key in bundle"
```

Then host `dist/` anywhere static (Netlify, Vercel, Cloudflare Pages, GH Pages).

## 3. Local dev (with live frontier, key in your .env.local)

The existing `.env.local` has `VITE_OPENROUTER_API_KEY`. `npm run dev` uses it
directly (safe, never leaves your machine).

## Security notes

- The worker's `ALLOWED_MODELS` set restricts the proxy to `stealth/ox-alpha`
  only, so a leaked proxy URL can't be used to run arbitrary paid models.
- The proxy never echoes the key back to the client.
- For extra safety on a public share, set a low monthly spend limit on the
  OpenRouter key used by the worker (OpenRouter dashboard -> key -> Limit).
