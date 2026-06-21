# 📊 Small-Business Sales Insights Dashboard

A free, no-code-required **sales dashboard** for a small retail business (coffee
shop, boutique, bakery — anything with a list of sales). Upload a CSV exported
from your point-of-sale (POS) system and instantly get clear charts **and
plain-English insights** that most basic POS systems don't show you.

Built with Python + [Streamlit](https://streamlit.io). It ships with a realistic
**sample coffee-shop dataset** so it works the moment you open it, and it's built
to swallow messy real-world exports without breaking.

> **Two ways to use it:** run it on your own computer (below), or
> [deploy it free to the web](#-deploy-it-free-on-the-web-streamlit-community-cloud)
> so a business owner can use it with just a link.

---

## What it shows

**Headline numbers:** total revenue, total orders, average order value.

**💡 Key insights** — written as plain sentences an owner can act on, for example:
- 📅 *"Saturdays are your busiest day (~$X), Wednesdays the slowest — ~68% more on Saturdays."*
- ⏰ *"Your busiest time is around 8 AM; your three busiest hours are 43% of all orders."* (needs a timestamp)
- 🤝 *"'Drip Coffee' and 'Latte' are often bought together (19 orders) — try a combo deal."* (needs an order/receipt ID)
- 📉 *"Heads up: 'Americano' sales are down 47% recently."*
- 🔁 *"Repeat customers are 56% of customers but bring 90% of revenue."* (needs a customer ID)

**Charts:** revenue over time, top products, revenue by category, busiest days of
the week, repeat-vs-one-time customers, plus the raw transaction table.

Every chart and insight **degrades gracefully** — if your file is missing an
optional column, that piece is replaced with a short note instead of an error.

---

## What's in this folder

| File | What it is |
|------|------------|
| `dashboard.py` | The dashboard app (what you run). |
| `generate_sample_data.py` | Script that creates the sample `sales_data.csv`. |
| `sales_data.csv` | Sample data so the app works immediately. |
| `requirements.txt` | The exact package versions to install. |
| `README.md` | This file. |

---

## Run it on your computer

### Step 0 — do you have Python?

You need **Python 3.9+**. Check in a terminal (Terminal on macOS/Linux,
PowerShell on Windows):

```bash
python --version
```

No Python? Install it from [python.org/downloads](https://www.python.org/downloads/)
(on Windows, tick **"Add Python to PATH"** during setup), then reopen the terminal.

### Step 1 — open a terminal in this folder

```bash
cd path/to/coffee-shop-dashboard
```

### Step 2 — (recommended) create a private package box and turn it on

```bash
python -m venv .venv
# macOS / Linux:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
```

### Step 3 — install the packages

```bash
pip install -r requirements.txt
```

### Step 4 — run it

```bash
streamlit run dashboard.py
```

You'll see `Local URL: http://localhost:8501`. Your browser usually opens
automatically; if not, go to **http://localhost:8501** yourself. Leave the
terminal running while you use it; press **Ctrl + C** to stop.

---

## Using your own data

### The easy way: the upload button

Run the app, then in the sidebar use **"Upload your sales CSV"** and pick your
file. Everything updates instantly. (This is the recommended way — nothing to
rename on disk.)

### What your file needs

A **`.csv`** with a header row. **Good news: column names are flexible** — the app
automatically recognizes common variations, so `Date`, `transaction_date` and
`Sale Date` all work, as do `Item`/`product`, `Qty`/`quantity`, `Price`/`unit_price`,
and so on.

**Required** (the app needs all three pieces of information):

| Information | Column names it recognizes |
|---|---|
| **Date of sale** | `date`, `Date`, `transaction_date`, `timestamp`, `datetime`, … |
| **Item sold** | `product`, `item`, `name`, `product_name`, `description`, … |
| **How much** | a `total` / `amount` column, **OR** a `price` column **and** a `quantity` column |

> If you only have a price and a quantity, the app calculates the total for you.

**Optional** (each one unlocks more analysis):

| Information | Column names it recognizes | Unlocks |
|---|---|---|
| Category | `category`, `type`, `department`, … | Revenue-by-category chart |
| Customer | `customer`, `customer_id`, `email`, … | Repeat-customer analysis |
| Order / receipt # | `order_id`, `transaction_id`, `receipt`, … | "Bought together" pairings |
| A time on the date | (any timestamp like `2025-10-04 08:30`) | Busiest-time-of-day insight |

A good file looks like this:

```csv
transaction_id,transaction_date,product_name,product_category,quantity,unit_price,total_amount,customer_id
T1001,2025-10-04 08:30,Latte,Hot Coffee,1,4.50,4.50,C0142
T1001,2025-10-04 08:30,Croissant,Bakery,2,3.25,6.50,C0142
T1002,2025-10-04 09:05,Cold Brew,Cold Coffee,1,4.50,4.50,C0088
```

**How the app handles messy real-world files:**
- `$` signs and thousands commas in prices (`$1,234.50`) are cleaned automatically.
- Many date formats are understood (`2025-10-04`, `10/4/2025`, `Oct 4 2025 8:30 AM`).
- Rows with an unreadable date/amount or a blank item are **skipped**, and the app
  tells you exactly how many.
- Extra columns you don't need are ignored.
- If a *required* column is missing, you get a clear message naming it.

**Exporting a CSV from common systems:** *Square:* Reports → Transactions →
Export. *Toast / Clover / Lightspeed:* Reports → Sales → Export to CSV.
*Shopify:* Analytics → Reports, or Orders → Export. *Excel / Google Sheets:*
File → Save As / Download → CSV.

---

## 🌐 Deploy it free on the web (Streamlit Community Cloud)

This puts your dashboard online at a shareable link, for free — perfect for handing
a business owner a URL they can use anytime. No server admin required.

1. **Get the code on GitHub.** It already lives in this repository. Streamlit
   Cloud can deploy straight from a branch (you don't have to merge first).
2. Go to **[share.streamlit.io](https://share.streamlit.io)** and **sign in with
   GitHub**. Approve the access request (works with private repos too).
3. Click **"Create app"** → **"Deploy a public app from GitHub"**.
4. Fill in:
   - **Repository:** your repo (e.g. `Zikobob/Stock-research`)
   - **Branch:** the branch your code is on
   - **Main file path:** `coffee-shop-dashboard/dashboard.py`
5. Click **Deploy**. Streamlit reads `requirements.txt` (which sits right next to
   `dashboard.py`), installs everything, and starts the app — about 1–2 minutes.
6. You'll get a public URL like `https://your-app-name.streamlit.app`. Share it!
   The sample data loads by default; you or the owner can upload a real CSV from
   the sidebar at any time.

**Updating the live app:** push new commits to the branch and Streamlit Cloud
redeploys automatically.

> **Privacy note:** when deployed, files uploaded through the web app are
> processed on Streamlit's servers (it's a hosted service). For sensitive data,
> run the dashboard locally instead — uploads then never leave your computer.

---

## About the sample data (and regenerating it)

`sales_data.csv` is **fake** data created by `generate_sample_data.py`. It models a
realistic coffee shop: ~2,000 orders over ~18 months, busier weekends, a morning
rush, a summer dip and holiday bump, hot drinks in winter / iced in summer,
multi-item orders, and a loyal-regulars-vs-casuals customer mix.

You never need to run it (the CSV is included), but you can regenerate or tweak it:

```bash
python generate_sample_data.py
```

All the "knobs" (menu, prices, seasonality, customer mix) are in the CONFIG
section near the top of that file.

---

## Make it your own (good next experiments)

- **Change the menu/prices:** edit the `PRODUCTS` list in `generate_sample_data.py`,
  re-run it, refresh the browser.
- **Measure "busiest day" by revenue** instead of order count (in `dashboard.py`).
- **Add a new insight:** the insight functions in `dashboard.py` (section 3) are
  small, self-contained, and return a plain sentence — copy one as a template.
- **Change the colors:** `COFFEE_BROWN` / `COFFEE_TAN` near the top of `dashboard.py`.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `command not found: streamlit` | Packages aren't installed / venv not active. Redo steps 2–3. |
| `python: command not found` | Try `python3` (and `pip3`). |
| Browser didn't open | Go to **http://localhost:8501** manually. |
| `Port 8501 is already in use` | Run `streamlit run dashboard.py --server.port 8502`. |
| The page says my file is missing a column | It names exactly which one — rename that column to a recognized name (see the table above). |
| I replaced `sales_data.csv` but still see old data | Restart the app (Ctrl+C, then run again). Uploading via the sidebar avoids this. |

---

*This is a learning/portfolio project. The bundled data is fake. Nothing here is
business or financial advice.*
