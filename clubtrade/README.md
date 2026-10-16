# ClubTrade: Investment Club Paper Trading

Real market prices, fake money, for a high school investment club. Each member gets a practice portfolio, and the whole club shares one **class portfolio** that members pitch trades into and admins (or votes) approve.

Built for locked-down school Chromebooks: the browser talks to **one domain only** (your site). Prices are fetched by the server, then re-served from `/api/...`. No CDNs, no fonts, no WebSockets, no popups, about 40 KB of JS/CSS in total.

## Try it on your computer (2 minutes, no API keys)

```bash
npm install
cp .dev.vars.example .dev.vars     # MOCK_DATA=1 means fake demo prices, no keys needed
npm run dev                        # creates the local database, serves http://localhost:8788
npm run seed                       # (optional, in a second terminal) demo club
```

Demo club: class code **DEMO01**. Sign in as `Ms. Rivera` (owner), `Treasurer Tom` or `Vice Vee` (admins), or `Maya`, `Diego`, ... (members). All demo passwords are `demo1234`. Run `npm run seed` only on an empty database. To start fresh, delete the `.wrangler` folder.

Without the seed, the first visitor sees the **set-up screen** and becomes the club owner.

Run the unit tests (fill logic, average cost, guardrails, vote tally, market hours): `npm test`

## Deploy for free on Cloudflare (click by click)

1. **Cloudflare account.** Go to dash.cloudflare.com, click *Sign up*, verify your email. No credit card is needed.
2. **Free data keys** (optional but recommended for real prices):
   - Finnhub: finnhub.io, *Get free API key*. Used for quotes and search.
   - Twelve Data: twelvedata.com, *Get your free API key*. Used for charts and as a quote fallback.
   - Alpha Vantage: alphavantage.co/support/#api-key. Optional, adds P/E and sector.
   Without keys the site still works: it falls back to Stooq and Yahoo (no key, less reliable).
3. **Install and log in** (on any computer with Node 20+):
   ```bash
   npm install
   npx wrangler login               # a browser tab opens, click Allow
   ```
4. **Create the database and cache:**
   ```bash
   npx wrangler d1 create clubtrade
   npx wrangler kv namespace create KV
   ```
   Each command prints an id. Paste them into `wrangler.toml` in place of `REPLACE_WITH_D1_ID` and `REPLACE_WITH_KV_ID`.
5. **Create the tables:** `npx wrangler d1 migrations apply clubtrade --remote`
6. **Create the site:** `npx wrangler pages project create clubtrade --production-branch main`
7. **Add secrets** (each command asks you to paste the value):
   ```bash
   npx wrangler pages secret put SESSION_SECRET     # any long random text
   npx wrangler pages secret put FINNHUB_KEY
   npx wrangler pages secret put TWELVEDATA_KEY
   npx wrangler pages secret put ALPHAVANTAGE_KEY   # optional
   ```
   Do **not** set `MOCK_DATA` in production.
8. **Deploy:** `npm run deploy`. Your site is at `https://clubtrade.pages.dev` (or the name you chose).
9. **Create the club:** open the site, fill in the set-up screen. Open **Admin** to see your class code, then share it with members. Use **Admin, Create an admin invite link** to add up to two more admins.
10. Open `/status` and check it says the data provider is reachable.

Re-deploy after changes with `npm run deploy`. A custom domain can be added in the Cloudflare dashboard under *Workers & Pages, clubtrade, Custom domains*.

*Fallback host:* Vercel (with Vercel Postgres or Upstash) also works in principle, but this repo is written for Cloudflare Pages Functions, D1 and KV, so moving would need the data layer ported.

## If the school blocks it

1. Open `/status` on the blocked computer (or ask a friend who can) and screenshot it. It says in plain English whether the site, database and data provider work.
2. Tell your advisor. The only reliable fix is for school IT to **allowlist the site's address**. Nothing here tries to hide the site or dodge monitoring, and it should not.
3. Email template for your advisor:

> Subject: Please allowlist our investment club's paper-trading site
>
> Hi [Name],
> Our investment club uses a classroom simulation, [https://YOUR-SITE.pages.dev], to practice investing with fake money and delayed real prices. It collects no real names, emails or money, and it only talks to its own address. Could IT please allow that address on student Chromebooks and the web filter (GoGuardian/Securly or similar)? It is educational: no gambling, no real trading, no chat with outsiders.
> Thank you, [Your name]

## How it fits together

| Part | Where | What it does |
|---|---|---|
| Pages and styles | `public/` | Plain HTML/CSS/JS modules, hash routing, SVG charts. `/status` is `status.html`. |
| API | `functions/api/[[path]].js` → `src/api.js` | Every route, sessions, orders, requests, admin. |
| Market data | `src/market.js` | Providers + caching + fallbacks. |
| Rules | `src/trade.js` | Pure functions, covered by `tests/`. |
| Tables | `migrations/0001_init.sql` | D1 (SQLite). Money is integer cents, times are UTC. |

**Data providers (server side, in order):** Finnhub quotes → Twelve Data (batch quotes, history) → Stooq (CSV, no key) → Yahoo unofficial chart endpoint (no key, may break). Alpha Vantage is only used for the company overview and is cached 24 hours. Quotes are cached 45 s, charts 10 min, search 24 h, and shared by the whole class through KV. If every provider fails, the last saved price is shown marked **STALE**.

Endpoints checked when this was written: Yahoo chart and search responses were tested live. Finnhub and Twelve Data were confirmed to exist and ask for a key (adapters follow their published response shapes, untested with a real key). **Stooq could not be reached from the build machine, so its adapter follows the documented CSV format and is untested.** Finnhub's candle (history) endpoint is not used because it needs a paid plan, so charts come from Twelve Data, then Yahoo, then Stooq. Open `/status` after deploying to see which providers really work from your account.

**Security:** passwords hashed with PBKDF2-SHA256 (100,000 rounds, per-user salt), sessions in an HttpOnly + SameSite=Lax (+ Secure on HTTPS) cookie whose server copy is an HMAC, rate limits on login/join/setup, a custom-header + Origin CSRF check on every POST, parameterized SQL only, all user text escaped on screen, a strict Content-Security-Policy (`public/_headers`), and spreadsheet-formula protection in the CSV export. No real names, emails or birthdays are collected.

## Known limits

- Prices are delayed or end-of-day (free data tiers). There is no real-time feed.
- Free-tier rate limits (Finnhub about 60 calls/min, Twelve Data 8/min and 800/day, Alpha Vantage 25/day) are shared by the whole club, which is why quotes are cached.
- Pages has no Cron Triggers, so limit orders, expiries and daily equity snapshots run **at most once a minute while someone has the site open**. Orders placed after hours fill at the next open when someone visits.
- Regular-hours US stocks and ETFs only: no crypto, options, shorting or margin. Early-close days are treated as full days, and the holiday list in `src/trade.js` ends in 2027.
- One club per site. Removing a member hides them (their past trades stay in the club history).

## Ideas for v2

Crypto, dividends, achievements/badges, season recap pages, a Cron Worker for exact timing.
