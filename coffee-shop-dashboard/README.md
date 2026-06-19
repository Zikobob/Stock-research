# ☕ Coffee Shop Sales Dashboard

A small, beginner-friendly **business analytics dashboard** built with Python and
[Streamlit](https://streamlit.io). It reads a CSV of sales transactions and turns
it into an interactive web page with revenue trends, top products, customer
insights, and a date filter.

It comes with a realistic **fake dataset** (~2,000 coffee-shop transactions over
18 months) so it works the moment you run it — and it's built so you can later
swap in a **real** business's sales spreadsheet (see
[Using your own data](#-using-your-own-data)).

> New to this? You don't need to understand the code to run it. Just follow the
> numbered steps below, copy-pasting each command.

---

## What the dashboard shows

- **Total revenue, total transactions, and average order value** (the headline numbers)
- **Revenue over time**, summarized by month (a line chart)
- **Top products by revenue** (a bar chart)
- **Revenue by product category** (a donut chart)
- **Busiest days of the week** (a bar chart)
- **Repeat vs. one-time customers** (counts + a donut chart)
- A **date-range filter** to focus on any time period
- An expandable table of the underlying transactions

---

## What's in this folder

| File | What it is |
|------|------------|
| `dashboard.py` | The dashboard app (what you run). |
| `generate_sample_data.py` | Script that creates the fake `sales_data.csv`. |
| `sales_data.csv` | The sample data the dashboard reads (already generated for you). |
| `requirements.txt` | The 3 Python packages this project needs. |
| `README.md` | This file. |

---

## Before you start: do you have Python?

You need **Python 3.9 or newer**. Check by running this in a terminal
(Terminal on macOS/Linux, or PowerShell / Command Prompt on Windows):

```bash
python3 --version
```

If you see something like `Python 3.11.x`, you're good. If it says the command
isn't found, try `python --version` instead. If neither works, install Python
from [python.org/downloads](https://www.python.org/downloads/) (on Windows,
tick **"Add Python to PATH"** during install), then re-open your terminal.

> Throughout this guide, if `python3` / `pip3` don't work on your machine, use
> `python` / `pip` instead — they're the same thing on most Windows setups.

---

## Step-by-step setup

### 1. Open a terminal in this folder

Get into the `coffee-shop-dashboard` folder. For example:

```bash
cd path/to/coffee-shop-dashboard
```

(Replace `path/to/` with wherever you saved it. Tip: on most systems you can
type `cd ` with a trailing space and then drag the folder onto the terminal
window to fill in the path.)

### 2. (Recommended) Create a virtual environment

A "virtual environment" is just a private box for this project's packages, so
they don't clash with anything else on your computer. It's optional but good
practice.

```bash
python3 -m venv .venv
```

Then **activate** it:

- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate.bat
  ```

You'll know it worked when your prompt starts showing `(.venv)`.

> Skipping this step is fine too — just go straight to step 3.

### 3. Install the required packages

```bash
pip install -r requirements.txt
```

This installs Streamlit, pandas, and Plotly. It may take a minute the first time.

### 4. (Optional) Regenerate the sample data

The dashboard already has `sales_data.csv`, so **you can skip this**. But if you
ever want fresh fake data, run:

```bash
python3 generate_sample_data.py
```

It prints a quick summary and overwrites `sales_data.csv`.

### 5. Run the dashboard

```bash
streamlit run dashboard.py
```

You'll see output like this:

```
  You can now view your Streamlit app in your browser.

  Local URL: http://localhost:8501
```

### 6. Open it in your browser

Streamlit usually opens your browser automatically. If it doesn't, open a
browser and go to:

**http://localhost:8501**

That's your dashboard. 🎉 Play with the date filter in the left sidebar.

### 7. Stopping (and re-starting) the app

- The terminal stays "busy" running the app — that's normal. To **stop** it,
  click the terminal and press **`Ctrl + C`**.
- To **run it again** later, just repeat steps 1–2 (activate the venv) and step 5
  (`streamlit run dashboard.py`).

---

## 📤 Using your own data

You can analyze a real business's sales in two ways.

### Option A — Upload it in the app (easiest, nothing to install)

1. Run the dashboard (`streamlit run dashboard.py`).
2. In the left sidebar, under **"Data source"**, click **"Upload your own sales CSV"**.
3. Choose your file. The whole dashboard updates instantly.

### Option B — Replace the sample file (makes it the new default)

Save the real data as a CSV named **`sales_data.csv`** in this folder, replacing
the sample. Next time you run the dashboard, it loads automatically.

*(Want a different filename? Open `dashboard.py` and change the line
`DEFAULT_FILE = "sales_data.csv"` near the top.)*

### The exact format a real file needs

The file must be a **`.csv`** with a **header row**, and the column names must
match exactly (all lowercase, with underscores).

**Required columns** — the dashboard won't run without these four:

| Column name        | What it holds                       | Example      |
|--------------------|-------------------------------------|--------------|
| `transaction_date` | The date of the sale                | `2025-10-04` |
| `product_name`     | The item sold                       | `Latte`      |
| `quantity`         | How many units were sold            | `2`          |
| `unit_price`       | Price of **one** unit, in dollars   | `4.50`       |

**Optional columns** — include them to unlock more of the dashboard:

| Column name        | What it adds                                                        | Example       |
|--------------------|---------------------------------------------------------------------|---------------|
| `total_amount`     | The line total. **If missing, it's calculated** as quantity × unit_price. | `9.00`  |
| `product_category` | Powers the **Revenue by category** chart.                           | `Hot Coffee`  |
| `customer_id`      | Any code/email that identifies a customer. Powers **repeat-customer** analysis. | `C0142` |

A valid file looks like this (the first line is the header):

```csv
transaction_date,product_name,product_category,quantity,unit_price,total_amount,customer_id
2025-10-04,Latte,Hot Coffee,1,4.50,4.50,C0142
2025-10-04,Croissant,Bakery,2,3.25,6.50,C0088
2025-10-05,Cold Brew,Cold Coffee,1,4.50,4.50,C0142
```

**Getting a CSV out of Excel or Google Sheets:**
- *Excel:* File → Save As → choose **CSV (Comma delimited) (.csv)**.
- *Google Sheets:* File → Download → **Comma-separated values (.csv)**.

Then make sure the header row uses the exact column names above (rename the
columns in the spreadsheet first if needed). Notes that make real data "just work":

- Date formats like `2025-10-04`, `10/4/2025`, or `Oct 4, 2025` are all understood.
- Extra columns you don't need are ignored — no need to delete them.
- Rows with a blank/garbled date or price are skipped, and the app tells you how many.

---

## Make it your own (good next experiments)

Once it's running, try changing things — breaking it and fixing it is how you learn:

- **Change the menu or prices:** edit the `PRODUCTS` list in
  `generate_sample_data.py`, then re-run it (step 4) and refresh the browser.
- **Measure "busiest day" by revenue instead of transaction count:** in
  `dashboard.py`, the *Busiest days of the week* section counts transactions —
  try summing `total_amount` per weekday instead.
- **Add a new chart**, e.g. average order value by month, or revenue by hour
  (you'd first add a time-of-day column to the data).
- **Change the look:** the `COFFEE_BROWN` color near the top of `dashboard.py`
  sets the chart color.

A fun detail to notice in the sample data: the **first and last months look
small** on the revenue line. That's correct — the data simply starts and ends
mid-month, so those months are partial. Real data does the same thing.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `command not found: streamlit` | The packages aren't installed (or your venv isn't active). Re-do steps 2–3. |
| `python3: command not found` | Use `python` instead of `python3` (and `pip` instead of `pip3`). |
| Browser didn't open | Manually visit **http://localhost:8501**. |
| `Port 8501 is already in use` | Another dashboard is still running. Either close it, or run `streamlit run dashboard.py --server.port 8502` and use that port. |
| `FileNotFoundError: sales_data.csv` | Run `python3 generate_sample_data.py` to create it, and make sure you're in the `coffee-shop-dashboard` folder. |
| Your real file errors out | The app lists exactly which required column is missing — check the names match the table above. |

---

*This is a learning project with fake sample data. Nothing here is business or
financial advice.*
