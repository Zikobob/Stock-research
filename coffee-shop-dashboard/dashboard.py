"""
dashboard.py
============

A plain-English sales dashboard for a small business owner, built with Streamlit.

It reads a CSV of sales (from almost any point-of-sale system) and shows:
  - headline numbers (revenue, orders, average order value)
  - a "Key insights" section written in plain English
  - charts: revenue over time, top products, revenue by category, busiest days,
    repeat vs. one-time customers, and the raw transactions

Run it locally from this folder with:

    streamlit run dashboard.py

Then open the http://localhost:8501 address it prints. Leave the terminal
running while you use it; press Ctrl+C to stop.

----------------------------------------------------------------------------
HOW THE CODE IS ORGANISED (helpful while you're learning):
  1. Constants & the column "aliases" used to auto-detect messy column names.
  2. Pure helper functions for cleaning data  (no Streamlit calls -> testable).
  3. Pure functions that compute each plain-English insight.
  4. UI helper functions (these DO use Streamlit).
  5. main() -- the page itself. Guarded by `if __name__ == "__main__"` so the
     functions above can be imported and unit-tested without drawing the page.
----------------------------------------------------------------------------
"""

import io
import os
from collections import Counter
from datetime import time
from itertools import combinations

import pandas as pd
import plotly.express as px
import streamlit as st

# ===========================================================================
# 1. CONSTANTS
# ===========================================================================

DEFAULT_FILE = "sales_data.csv"      # bundled sample data (optional at runtime)
COFFEE_BROWN = "#6f4e37"             # main chart colour
COFFEE_TAN = "#c4a484"               # secondary chart colour

WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday",
                 "Friday", "Saturday", "Sunday"]

# For each "canonical" column we understand, a set of alternative names we will
# accept from a real-world file. Names are matched after lower-casing and
# stripping spaces/underscores/punctuation, so "Unit Price", "unit_price" and
# "UNIT-PRICE" all collapse to "unitprice" and match here.
COLUMN_ALIASES = {
    "transaction_date": {
        "date", "transactiondate", "datetime", "timestamp", "time", "saledate",
        "orderdate", "day", "soldat", "createdat", "purchasedate", "saletime",
        "datetimeofsale", "orderdatetime", "transactiontime", "saledatetime",
    },
    "product_name": {
        "product", "item", "itemname", "productname", "name", "description",
        "menuitem", "skuname", "itemdescription", "productdescription",
        "lineitem", "article", "goods", "itemsold",
    },
    "product_category": {
        "category", "productcategory", "type", "group", "department",
        "menucategory", "itemcategory", "categoryname", "producttype",
        "productgroup", "itemtype", "dept",
    },
    "quantity": {
        "qty", "quantity", "count", "units", "qtysold", "quantitysold",
        "unitssold", "qnty", "numberofitems", "noofitems", "itemcount", "amountsold",
    },
    "unit_price": {
        "price", "unitprice", "itemprice", "priceeach", "rate", "priceperunit",
        "unitcost", "saleprice", "listprice", "pricepereach",
    },
    "total_amount": {
        "total", "totalamount", "amount", "linetotal", "totalprice", "subtotal",
        "saleamount", "extendedprice", "totalsale", "netamount", "grossamount",
        "lineamount", "totalrevenue", "revenue", "linerevenue", "amountpaid",
    },
    "customer_id": {
        "customer", "customerid", "custid", "client", "clientid", "memberid",
        "loyaltyid", "customername", "email", "customeremail", "customernumber",
        "loyaltynumber", "cardid", "customercode",
    },
    "transaction_id": {
        "transaction", "transactionid", "orderid", "order", "receipt",
        "receiptid", "ticket", "ticketid", "invoice", "invoiceid", "ordernumber",
        "transactionno", "checkid", "billid", "saleid", "receiptnumber",
        "orderno", "transactionnumber", "ordernum", "checknumber",
    },
}

# Plain-English description of each column, shown if it's missing.
COLUMN_HELP = {
    "transaction_date": "the date of each sale (a column like 'date', 'Date', or 'timestamp')",
    "product_name": "the item that was sold (a column like 'product', 'item', or 'name')",
    "revenue": ("how much each sale was — either a 'total'/'amount' column, "
                "OR both a 'price' column and a 'quantity' column"),
}


# ===========================================================================
# 2. PURE DATA-CLEANING HELPERS  (no Streamlit -> easy to test)
# ===========================================================================

def normalize_name(name: str) -> str:
    """Collapse a column name to letters+digits only, lower-cased.

    'Unit Price' -> 'unitprice',  'Order #' -> 'order',  'QTY_sold' -> 'qtysold'
    """
    return "".join(ch for ch in str(name).lower() if ch.isalnum())


def detect_columns(columns: list) -> dict:
    """Work out how to rename the file's columns to our canonical names.

    Returns a dict like {'Sale Date': 'transaction_date', 'Item': 'product_name'}.
    Columns that already have the right name, or that we don't recognise, are
    left alone. Each canonical name is only ever assigned once (the first match
    wins), so we never accidentally create two columns with the same name.
    """
    # Flatten the alias table into one lookup: normalized alias -> canonical.
    lookup = {alias: canon
              for canon, aliases in COLUMN_ALIASES.items()
              for alias in aliases}

    rename = {}
    taken = {c for c in columns if c in COLUMN_ALIASES}  # already-correct names
    for col in columns:
        if col in COLUMN_ALIASES:
            continue  # already named correctly
        canon = lookup.get(normalize_name(col))
        if canon and canon not in taken:
            rename[col] = canon
            taken.add(canon)
    return rename


def clean_money(series: pd.Series) -> pd.Series:
    """Turn a price/total column into numbers, even if it has $ signs & commas.

    '$1,234.50' -> 1234.50,  '3.00 USD' -> 3.00,  'free' -> NaN
    """
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce")
    text = series.astype(str).str.replace(r"[^0-9.\-]", "", regex=True)
    text = text.replace("", None)
    return pd.to_numeric(text, errors="coerce")


def clean_quantity(series: pd.Series) -> pd.Series:
    """Turn a quantity column into positive whole-ish numbers; default bad to 1."""
    if pd.api.types.is_numeric_dtype(series):
        q = pd.to_numeric(series, errors="coerce")
    else:
        text = series.astype(str).str.replace(r"[^0-9.\-]", "", regex=True)
        q = pd.to_numeric(text.replace("", None), errors="coerce")
    q = q.fillna(1)
    return q.where(q > 0, 1)  # zero/negative quantities become 1


def parse_dates(series: pd.Series) -> pd.Series:
    """Parse many date formats; unparseable values become NaT (skipped later)."""
    if pd.api.types.is_datetime64_any_dtype(series):
        return series
    try:
        return pd.to_datetime(series, errors="coerce", format="mixed")
    except Exception:
        return pd.to_datetime(series, errors="coerce")


def has_time_component(dt_series: pd.Series) -> bool:
    """True if the dates carry a real time-of-day (not just midnight)."""
    s = dt_series.dropna()
    if s.empty:
        return False
    return bool(((s.dt.hour != 0) | (s.dt.minute != 0) | (s.dt.second != 0)).any())


def _missing_message(missing: list, original_columns: list) -> str:
    """Friendly explanation of which required information couldn't be found."""
    lines = []
    for m in missing:
        label = "a revenue column" if m == "revenue" else f"`{m}`"
        lines.append(f"- **{label}** — {COLUMN_HELP[m]}")
    seen = ", ".join(f"`{c}`" for c in original_columns) or "(none)"
    return (
        "I couldn't find some required information in your file:\n\n"
        + "\n".join(lines)
        + f"\n\nThe columns I found were: {seen}.\n\n"
        "**Fix:** rename your columns to match (see the *How to use this* guide "
        "below), then upload again."
    )


def prepare(raw: pd.DataFrame):
    """Clean & validate a raw sales table.

    Returns (clean_df, report). On failure clean_df is None and report['error']
    holds a friendly, specific message. This function never raises and never
    touches Streamlit, so it can be unit-tested directly.
    """
    report = {
        "original_columns": [] if raw is None else list(raw.columns),
        "renames": {}, "rows_in": 0, "rows_out": 0,
        "dropped_bad_date": 0, "dropped_bad_amount": 0, "dropped_bad_product": 0,
        "revenue_source": "", "notes": [], "error": None,
    }

    if raw is None or raw.shape[1] == 0 or len(raw) == 0:
        report["error"] = "That file looks empty — it has no rows of data."
        return None, report

    df = raw.copy()
    df.columns = [str(c).strip() for c in df.columns]
    report["rows_in"] = len(df)

    # --- auto-detect & rename columns ---
    rename = detect_columns(list(df.columns))
    df = df.rename(columns=rename)
    report["renames"] = rename

    # --- check we have the essentials ---
    missing = []
    if "transaction_date" not in df.columns:
        missing.append("transaction_date")
    if "product_name" not in df.columns:
        missing.append("product_name")
    has_total = "total_amount" in df.columns
    has_price = "unit_price" in df.columns
    has_qty = "quantity" in df.columns
    if not has_total and not (has_price and has_qty):
        missing.append("revenue")
    if missing:
        report["error"] = _missing_message(missing, report["original_columns"])
        report["missing"] = missing
        return None, report

    # --- dates ---
    df["transaction_date"] = parse_dates(df["transaction_date"])
    before = len(df)
    df = df[df["transaction_date"].notna()]
    report["dropped_bad_date"] = before - len(df)

    # --- quantity (default to 1 if the column is absent) ---
    if has_qty:
        df["quantity"] = clean_quantity(df["quantity"])
    else:
        df["quantity"] = 1
        report["notes"].append("No quantity column found — assumed 1 item per line.")

    # --- money & the all-important total_amount ---
    if has_price:
        df["unit_price"] = clean_money(df["unit_price"])
    if has_total:
        df["total_amount"] = clean_money(df["total_amount"])
        report["revenue_source"] = "your total/amount column"
        # Backfill any blank totals from price x quantity when we can.
        if has_price:
            gap = df["total_amount"].isna() & df["unit_price"].notna()
            df.loc[gap, "total_amount"] = df.loc[gap, "unit_price"] * df.loc[gap, "quantity"]
    else:
        df["total_amount"] = df["unit_price"] * df["quantity"]
        report["revenue_source"] = "price × quantity (calculated for you)"

    # Make sure a unit_price exists for the raw table even if it wasn't supplied.
    if "unit_price" not in df.columns:
        safe_qty = df["quantity"].where(df["quantity"] > 0)
        df["unit_price"] = df["total_amount"] / safe_qty

    # --- drop unusable rows (blank product, or bad/zero amount) ---
    # Note: in pandas 3, astype(str) keeps NaN as NaN (not the text "nan"), so we
    # detect blanks with fillna("") first, which turns real missing values into "".
    before = len(df)
    product_text = df["product_name"].fillna("").astype(str).str.strip()
    blank_product = product_text.str.lower().isin(["", "nan", "none"])
    df = df[~blank_product].copy()
    df["product_name"] = df["product_name"].astype(str).str.strip()
    report["dropped_bad_product"] = before - len(df)
    before = len(df)
    df = df[df["total_amount"].notna() & (df["total_amount"] > 0)]
    report["dropped_bad_amount"] = before - len(df)

    # --- tidy the optional columns (same fillna-before-astype safety) ---
    if "product_category" in df.columns:
        cat = df["product_category"].fillna("").astype(str).str.strip()
        df["product_category"] = cat.where(
            ~cat.str.lower().isin(["", "nan", "none"]), "Uncategorized")
    for col in ("customer_id", "transaction_id"):
        if col in df.columns:
            text = df[col].fillna("").astype(str).str.strip()
            blank = text.str.lower().isin(["", "nan", "none"])
            df[col] = text.where(~blank, pd.NA)

    df = df.reset_index(drop=True)
    report["rows_out"] = len(df)
    if len(df) == 0:
        report["error"] = (
            "After cleaning, no usable rows were left — please double-check the "
            "dates and amounts in your file."
        )
        return None, report
    return df, report


def detect_flags(df: pd.DataFrame) -> dict:
    """Which optional features are available for this dataset?"""
    return {
        "category": bool("product_category" in df.columns and df["product_category"].notna().any()),
        "customer": bool("customer_id" in df.columns and df["customer_id"].notna().any()),
        "txn": bool("transaction_id" in df.columns and df["transaction_id"].notna().any()),
        "time": bool(has_time_component(df["transaction_date"])),
    }


def order_count(data: pd.DataFrame, flags: dict) -> int:
    """Number of orders: distinct transaction_ids if we have them, else rows."""
    if flags["txn"]:
        return int(data["transaction_id"].nunique())
    return len(data)


# ===========================================================================
# 3. PURE INSIGHT FUNCTIONS  (each returns a plain-English string, or None)
# ===========================================================================

def _fmt_hour(h: int) -> str:
    """24h number -> friendly '8 AM' / '1 PM'."""
    h = int(h) % 24
    suffix = "AM" if h < 12 else "PM"
    twelve = h % 12 or 12
    return f"{twelve} {suffix}"


def insight_busiest_day(data: pd.DataFrame):
    """Busiest vs slowest weekday, by average revenue per that weekday."""
    daily = data.groupby(data["transaction_date"].dt.normalize())["total_amount"].sum()
    if daily.empty:
        return None
    by_weekday = daily.groupby(daily.index.day_name()).mean()
    by_weekday = by_weekday.reindex([d for d in WEEKDAY_ORDER if d in by_weekday.index])
    if by_weekday.size < 2:
        return None
    busiest, slowest = by_weekday.idxmax(), by_weekday.idxmin()
    hi, lo = by_weekday.max(), by_weekday.min()
    pct = (hi / lo - 1) * 100 if lo > 0 else 0
    return (
        f"📅 **{busiest}s are your busiest day** (about **${hi:,.0f}** on a typical "
        f"{busiest}), while **{slowest}s are the slowest** (about **${lo:,.0f}**) — "
        f"roughly **{pct:.0f}% more** revenue on {busiest}s. Consider extra staff on "
        f"{busiest}s and a promotion to lift {slowest}s."
    )


def insight_peak_hours(data: pd.DataFrame, has_time: bool):
    """Busiest time of day — only if the data has real timestamps."""
    if not has_time:
        return None
    by_hour = data.groupby(data["transaction_date"].dt.hour).size()
    if by_hour.empty:
        return None
    peak = int(by_hour.idxmax())
    top3 = by_hour.sort_values(ascending=False).head(3)
    share = top3.sum() / by_hour.sum() if by_hour.sum() else 0
    hours_text = ", ".join(_fmt_hour(h) for h in sorted(top3.index))
    return (
        f"⏰ **Your busiest time of day is around {_fmt_hour(peak)}.** Your three "
        f"busiest hours ({hours_text}) account for **{share:.0%}** of all orders — "
        f"make sure you're well-staffed and stocked then."
    )


def insight_pairings(data: pd.DataFrame, has_txn: bool):
    """Most common pair of items bought in the same order."""
    if not has_txn:
        return None
    items_per_order = data.groupby("transaction_id")["product_name"].agg(
        lambda s: sorted(set(s))
    )
    pair_counts = Counter()
    for items in items_per_order:
        if len(items) >= 2:
            pair_counts.update(combinations(items, 2))
    if not pair_counts:
        return None
    (item_a, item_b), n = pair_counts.most_common(1)[0]
    if n < 3:  # need a real pattern, not a one-off
        return None
    return (
        f"🤝 **'{item_a}' and '{item_b}' are often bought together** (in {n} "
        f"orders). A combo or bundle deal on these two could raise your average "
        f"order size."
    )


def insight_trending_down(data: pd.DataFrame):
    """A product whose revenue dropped notably in the recent period."""
    dmax = data["transaction_date"].max().normalize()
    dmin = data["transaction_date"].min().normalize()
    span = (dmax - dmin).days
    if span < 28:  # not enough history to compare periods fairly
        return None
    window = min(90, max(14, span // 2))
    recent_start = dmax - pd.Timedelta(days=window)
    prior_start = recent_start - pd.Timedelta(days=window)
    recent = data[data["transaction_date"] >= recent_start]
    prior = data[(data["transaction_date"] >= prior_start)
                 & (data["transaction_date"] < recent_start)]
    if recent.empty or prior.empty:
        return None

    rev_recent = recent.groupby("product_name")["total_amount"].sum()
    rev_prior = prior.groupby("product_name")["total_amount"].sum()

    worst = None  # (product, pct_change, prior_rev, recent_rev, abs_drop)
    for product, prior_rev in rev_prior.items():
        if prior_rev < 30:  # ignore tiny/noisy products
            continue
        recent_rev = float(rev_recent.get(product, 0.0))
        change = (recent_rev - prior_rev) / prior_rev
        if change <= -0.30:  # at least a 30% fall
            drop = prior_rev - recent_rev
            if worst is None or drop > worst[4]:
                worst = (product, change, prior_rev, recent_rev, drop)
    if worst is None:
        return None
    product, change, prior_rev, recent_rev, _ = worst
    return (
        f"📉 **Heads up: '{product}' sales are sliding.** In the last {window} days "
        f"it made **${recent_rev:,.0f}**, down **{abs(change) * 100:.0f}%** from "
        f"${prior_rev:,.0f} the {window} days before. Worth checking stock, "
        f"quality, pricing, or its spot on the menu."
    )


def insight_retention(data: pd.DataFrame, has_customer: bool, has_txn: bool):
    """Repeat-customer share of customers and of revenue, with a takeaway."""
    if not has_customer:
        return None
    customers = data.dropna(subset=["customer_id"])
    if customers.empty:
        return None
    revenue = customers.groupby("customer_id")["total_amount"].sum()
    if has_txn:
        visits = customers.groupby("customer_id")["transaction_id"].nunique()
    else:
        visits = customers.groupby("customer_id").size()

    repeat_ids = visits[visits > 1].index
    n_total = len(revenue)
    if n_total == 0:
        return None
    n_repeat = len(repeat_ids)
    total_rev = revenue.sum()
    repeat_rev = revenue.loc[repeat_ids].sum() if n_repeat else 0.0
    cust_pct = n_repeat / n_total
    rev_pct = (repeat_rev / total_rev) if total_rev else 0

    if rev_pct >= 0.5:
        takeaway = ("Your regulars are the backbone of the business — a loyalty "
                    "card or remembering their usual order protects most of your "
                    "revenue.")
    else:
        takeaway = ("Most revenue comes from one-time visitors — a simple loyalty "
                    "punch card could turn more of them into regulars.")
    return (
        f"🔁 **Repeat customers are {cust_pct:.0%} of your customers but bring "
        f"{rev_pct:.0%} of revenue.** {takeaway}"
    )


def compute_insights(data: pd.DataFrame, flags: dict) -> list:
    """Run every insight, skipping any that don't apply or error out."""
    builders = [
        lambda: insight_busiest_day(data),
        lambda: insight_peak_hours(data, flags["time"]),
        lambda: insight_pairings(data, flags["txn"]),
        lambda: insight_trending_down(data),
        lambda: insight_retention(data, flags["customer"], flags["txn"]),
    ]
    results = []
    for build in builders:
        try:
            line = build()
        except Exception:
            line = None  # an insight should never crash the dashboard
        if line:
            results.append(line)
    return results


def escape_dollars(text: str) -> str:
    r"""Make '$' safe inside Streamlit markdown by replacing each one with the
    HTML numeric entity '&#36;'.

    Streamlit renders markdown with LaTeX support, so a pair of '$' turns the
    text between them into math — mashing the words (and any ** bold ** markers)
    together. A backslash escape ('\$') is NOT reliable here: Streamlit's math
    tokenizer can ignore the backslash, especially when the '$' sits inside
    **bold**. '&#36;' sidesteps the problem entirely — the math tokenizer never
    sees a '$' character at all, yet the browser still displays a normal '$'.
    This is applied AFTER the ** bold ** markers are added, and works inside them.
    """
    return text.replace("$", "&#36;")


# ===========================================================================
# 4. UI HELPERS  (these use Streamlit; only called at runtime, not on import)
# ===========================================================================

@st.cache_data(show_spinner=False)
def read_csv_bytes(file_bytes: bytes) -> pd.DataFrame:
    """Read uploaded CSV bytes, sniffing the delimiter if the default fails."""
    buffer = io.BytesIO(file_bytes)
    try:
        df = pd.read_csv(buffer)
    except Exception:
        buffer.seek(0)
        df = pd.read_csv(buffer, sep=None, engine="python")
    # If everything landed in one column, the delimiter was probably ; or tab.
    if df.shape[1] == 1:
        buffer.seek(0)
        try:
            alt = pd.read_csv(buffer, sep=None, engine="python")
            if alt.shape[1] > 1:
                df = alt
        except Exception:
            pass
    return df


@st.cache_data(show_spinner=False)
def read_csv_path(path: str) -> pd.DataFrame:
    """Read the bundled sample CSV from disk (cached)."""
    return pd.read_csv(path)


def render_how_to(expanded: bool = False) -> None:
    """A friendly guide for non-technical owners on exporting & uploading data."""
    with st.expander("❓ How to use this — getting your sales into the dashboard",
                     expanded=expanded):
        st.markdown(
            """
**1. Export your sales as a CSV from your point-of-sale (POS) system.**
It's usually under *Reports → Sales → Export* (or "Download CSV"):
- **Square:** Dashboard → Reports → Transactions → *Export*.
- **Toast / Clover / Lightspeed:** Reports → Sales → *Export to CSV*.
- **Shopify:** Analytics → Reports (or Orders → *Export*).
- **Just a spreadsheet (Excel / Google Sheets)?** File → *Save As / Download → CSV*.

**2. Make sure it has these columns.** Names are flexible — the app
auto-detects common variations (e.g. `Date`, `Item`, `Qty`, `Price`):

| Information | Column names it recognises | Needed? |
|---|---|---|
| Date of sale | `date`, `Date`, `transaction_date`, `timestamp` | ✅ required |
| Item sold | `product`, `item`, `name`, `product_name` | ✅ required |
| How much it was | a `total`/`amount` column, **or** `price` + `quantity` | ✅ required |
| Category | `category`, `type`, `department` | optional |
| Customer | `customer`, `customer_id`, `email` | optional |
| Order / receipt # | `order_id`, `transaction_id`, `receipt` | optional |

The **optional** columns unlock extra insights (category breakdown, repeat-customer
analysis, and "frequently bought together" pairings). Anything missing is simply
skipped — the app won't break.

**3. Upload it** with the button in the sidebar. The dashboard updates instantly.
Your file is only used to build these charts for your current session.
"""
        )


def render_landing() -> None:
    """Welcoming screen shown when there's no data yet (nothing to crash on)."""
    st.title("📊 Sales Insights Dashboard")
    st.markdown(
        "Turn your sales spreadsheet into clear charts and plain-English insights "
        "— the kind of thing your point-of-sale system probably doesn't show you. "
        "**No spreadsheets, no setup.**"
    )
    st.info("👈 To begin, upload a CSV of your sales using **Upload your sales CSV** "
            "in the sidebar.")
    render_how_to(expanded=True)


def render_load_summary(report: dict, label: str, is_sample: bool, flags: dict) -> None:
    """Friendly confirmation of what was loaded, what was skipped, and how columns mapped."""
    if is_sample:
        st.info("👋 You're viewing **sample coffee-shop data** so you can see how "
                "everything works. Upload your own CSV in the sidebar to analyze "
                "your business.")

    st.success(
        f"Loaded **{report['rows_out']:,} rows** from **{label}** "
        f"(revenue from {report['revenue_source']})."
    )

    skipped = (report["dropped_bad_date"] + report["dropped_bad_amount"]
               + report["dropped_bad_product"])
    if skipped:
        st.warning(
            f"Skipped **{skipped}** unusable row(s) — "
            f"{report['dropped_bad_date']} with a bad date, "
            f"{report['dropped_bad_amount']} with a bad amount, "
            f"{report['dropped_bad_product']} missing an item name. "
            f"Everything else is included."
        )
    for note in report["notes"]:
        st.caption("ℹ️ " + note)

    if report["renames"]:
        with st.expander("How the app read your columns"):
            for src, canon in report["renames"].items():
                st.write(f"• **{src}** → understood as `{canon}`")
            active = [name for name, on in
                      {"category breakdown": flags["category"],
                       "repeat-customer analysis": flags["customer"],
                       "bought-together pairings": flags["txn"],
                       "time-of-day insights": flags["time"]}.items() if on]
            if active:
                st.caption("Extra features active for your data: " + ", ".join(active) + ".")


# ===========================================================================
# 5. THE PAGE
# ===========================================================================

def main() -> None:
    st.set_page_config(page_title="Sales Insights Dashboard", page_icon="📊",
                       layout="wide")

    # --- Sidebar: choose the data source --------------------------------------
    st.sidebar.header("① Your data")
    uploaded = st.sidebar.file_uploader(
        "Upload your sales CSV", type=["csv"],
        help="Export from your POS as CSV. See 'How to use this' on the page.",
    )

    if uploaded is not None:
        try:
            raw = read_csv_bytes(uploaded.getvalue())
        except Exception as exc:
            st.title("📊 Sales Insights Dashboard")
            st.error(f"Sorry, I couldn't read **{uploaded.name}** as a CSV file.\n\n"
                     f"Details: {exc}\n\nMake sure it's a `.csv` exported from your "
                     "POS or spreadsheet, then try again.")
            render_how_to(expanded=True)
            return
        source_label, is_sample = uploaded.name, False
    elif os.path.exists(DEFAULT_FILE):
        raw = read_csv_path(DEFAULT_FILE)
        source_label, is_sample = f"{DEFAULT_FILE}", True
    else:
        # No upload and no bundled file -> welcoming landing instead of an error.
        render_landing()
        return

    # --- Clean & validate -----------------------------------------------------
    data_all, report = prepare(raw)
    if data_all is None:
        st.title("📊 Sales Insights Dashboard")
        st.error(report["error"])
        render_how_to(expanded=True)
        return

    flags = detect_flags(data_all)
    render_load_summary(report, source_label, is_sample, flags)

    # --- Sidebar: date filter -------------------------------------------------
    st.sidebar.header("② Filter")
    min_date = data_all["transaction_date"].min().date()
    max_date = data_all["transaction_date"].max().date()
    date_range = st.sidebar.date_input(
        "Date range", value=(min_date, max_date),
        min_value=min_date, max_value=max_date,
    )
    if not isinstance(date_range, (list, tuple)) or len(date_range) != 2:
        st.info("Pick a start date **and** an end date in the sidebar to continue.")
        return
    start_date, end_date = date_range
    mask = ((data_all["transaction_date"].dt.date >= start_date)
            & (data_all["transaction_date"].dt.date <= end_date))
    data = data_all.loc[mask]

    # --- Header ---------------------------------------------------------------
    st.title("📊 Sales Insights Dashboard")
    st.caption(f"Showing {start_date:%b %d, %Y} – {end_date:%b %d, %Y}")

    if data.empty:
        st.warning("No sales fall in this date range. Try widening the dates in the "
                   "sidebar.")
        return

    # --- Headline numbers (KPIs) ---------------------------------------------
    n_orders = order_count(data, flags)
    total_revenue = float(data["total_amount"].sum())
    avg_order_value = total_revenue / n_orders if n_orders else 0
    orders_label = "Total Orders" if flags["txn"] else "Total Transactions"

    k1, k2, k3 = st.columns(3)
    k1.metric("Total Revenue", f"${total_revenue:,.2f}")
    k2.metric(orders_label, f"{n_orders:,}")
    k3.metric("Average Order Value", f"${avg_order_value:,.2f}")

    # --- Key insights (the headline feature) ---------------------------------
    st.subheader("💡 Key insights")
    insights = compute_insights(data, flags)
    if insights:
        with st.container(border=True):
            for line in insights:
                # Escape '$' so Streamlit doesn't render dollar amounts as LaTeX math.
                st.markdown(escape_dollars(line))
    else:
        st.caption("Add category, customer, order-ID, or timestamp columns to your "
                   "data to unlock automatic insights.")

    st.divider()

    # --- Revenue over time ----------------------------------------------------
    st.subheader("Revenue over time")
    monthly = (data.set_index("transaction_date")["total_amount"]
               .resample("MS").sum().reset_index())
    fig_time = px.line(monthly, x="transaction_date", y="total_amount", markers=True,
                       labels={"transaction_date": "Month", "total_amount": "Revenue ($)"})
    fig_time.update_traces(line_color=COFFEE_BROWN)
    st.plotly_chart(fig_time, width="stretch")

    # --- Top products + revenue by category ----------------------------------
    left, right = st.columns(2)
    with left:
        st.subheader("Top products by revenue")
        top_products = (data.groupby("product_name")["total_amount"].sum()
                        .sort_values(ascending=False).head(10).reset_index())
        fig_products = px.bar(top_products, x="total_amount", y="product_name",
                              orientation="h",
                              labels={"total_amount": "Revenue ($)", "product_name": ""})
        fig_products.update_traces(marker_color=COFFEE_BROWN)
        fig_products.update_layout(yaxis={"categoryorder": "total ascending"})
        st.plotly_chart(fig_products, width="stretch")

    with right:
        st.subheader("Revenue by category")
        if flags["category"]:
            by_cat = (data.groupby("product_category")["total_amount"].sum()
                      .sort_values(ascending=False).reset_index())
            fig_cat = px.pie(by_cat, names="product_category", values="total_amount",
                             hole=0.5)
            fig_cat.update_traces(textposition="inside", textinfo="percent+label")
            st.plotly_chart(fig_cat, width="stretch")
        else:
            st.info("Add a **category** column (e.g. `category`, `type`, "
                    "`department`) to see revenue split by category.")

    # --- Busiest days + repeat vs one-time customers -------------------------
    left2, right2 = st.columns(2)
    with left2:
        st.subheader("Busiest days of the week")
        if flags["txn"]:
            counts = data.groupby(data["transaction_date"].dt.day_name())["transaction_id"].nunique()
            y_label = "Orders"
        else:
            counts = data["transaction_date"].dt.day_name().value_counts()
            y_label = "Transactions"
        counts = counts.reindex(WEEKDAY_ORDER, fill_value=0)
        weekday_df = pd.DataFrame({"Day": counts.index, y_label: counts.values})
        fig_week = px.bar(weekday_df, x="Day", y=y_label)
        fig_week.update_traces(marker_color=COFFEE_BROWN)
        st.plotly_chart(fig_week, width="stretch")

    with right2:
        st.subheader("Repeat vs. one-time customers")
        if flags["customer"]:
            customers = data.dropna(subset=["customer_id"])
            if flags["txn"]:
                visits = customers.groupby("customer_id")["transaction_id"].nunique()
            else:
                visits = customers["customer_id"].value_counts()
            repeat_count = int((visits > 1).sum())
            one_time_count = int((visits == 1).sum())

            c1, c2 = st.columns(2)
            c1.metric("Repeat customers", f"{repeat_count:,}")
            c2.metric("One-time customers", f"{one_time_count:,}")

            cust_df = pd.DataFrame({"Customer type": ["Repeat", "One-time"],
                                    "Count": [repeat_count, one_time_count]})
            fig_cust = px.pie(cust_df, names="Customer type", values="Count", hole=0.5,
                              color="Customer type",
                              color_discrete_map={"Repeat": COFFEE_BROWN,
                                                  "One-time": COFFEE_TAN})
            fig_cust.update_traces(textposition="inside", textinfo="percent+label")
            st.plotly_chart(fig_cust, width="stretch")
        else:
            st.info("Add a **customer** column (e.g. `customer_id`, `email`) to see "
                    "how many customers come back.")

    # --- Raw transactions -----------------------------------------------------
    with st.expander("See the underlying transactions"):
        st.dataframe(data.sort_values("transaction_date", ascending=False),
                     width="stretch", hide_index=True)

    # --- Help, always available at the bottom --------------------------------
    render_how_to(expanded=False)


if __name__ == "__main__":
    main()
