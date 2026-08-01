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


def insight_pareto(data: pd.DataFrame, threshold: float = 0.70):
    """'Bread & butter' vs 'long tail': the few products that drive most revenue.

    Sorts products by revenue, walks the cumulative share, and reports the
    smallest set of items that make up ~`threshold` of total revenue.
    """
    rev = data.groupby("product_name")["total_amount"].sum().sort_values(ascending=False)
    total = rev.sum()
    if total <= 0 or len(rev) < 4:
        return None
    cum_share = rev.cumsum() / total
    # smallest k whose cumulative share reaches the threshold
    k = int((cum_share < threshold).sum()) + 1
    k = min(k, len(rev))
    top_share = float(cum_share.iloc[k - 1])
    top_names = list(rev.index[:k])
    others = len(rev) - k
    # List every "bread & butter" product (cap a very long list so the sentence
    # stays readable). Previously this showed only the first 5 + "…", which
    # wrongly omitted products that the "top k" claim counted.
    if k <= 8:
        names_str = ", ".join(top_names)
    else:
        names_str = ", ".join(top_names[:8]) + f", and {k - 8} more"
    plural = "s" if k > 1 else ""
    return (
        f"🍞 **Your top {k} product{plural} bring {top_share * 100:.0f}% of revenue** "
        f"({names_str}), while the other {others} items together make just "
        f"{(1 - top_share) * 100:.0f}%. These few are your 'bread and butter' — "
        f"protect and promote them."
    )


def compute_outlier_alerts(data: pd.DataFrame, z_threshold: float = 2.0,
                           max_alerts: int = 5) -> list:
    """Flag unusually high/low sales days automatically.

    Compares each day's revenue to a baseline for the *same weekday* (so a busy
    Saturday isn't flagged just for being a Saturday), and reports days that are
    more than `z_threshold` standard deviations from that weekday's average.
    Returns plain-English strings, most extreme first.
    """
    daily = data.groupby(data["transaction_date"].dt.normalize())["total_amount"].sum()
    if len(daily) < 14:  # need a couple of weeks of history to have a baseline
        return []

    df = daily.reset_index()
    df.columns = ["date", "revenue"]
    df["weekday"] = df["date"].dt.day_name()

    found = []  # (abs_z, date, revenue, weekday_mean, pct_diff, weekday)
    for weekday, group in df.groupby("weekday"):
        if len(group) < 4:  # not enough of this weekday to judge "normal"
            continue
        mean = group["revenue"].mean()
        std = group["revenue"].std(ddof=0)
        if not std or pd.isna(std) or mean <= 0:
            continue
        for _, row in group.iterrows():
            z = (row["revenue"] - mean) / std
            if abs(z) >= z_threshold:
                pct = (row["revenue"] / mean - 1) * 100
                found.append((abs(z), row["date"], row["revenue"], mean, pct, weekday))

    found.sort(key=lambda t: t[0], reverse=True)
    alerts = []
    for _, date, revenue, mean, pct, weekday in found[:max_alerts]:
        # Avoid %-d (not portable): format the day number by hand.
        nice_date = date.strftime("%A, %b ") + f"{date.day}, {date.year}"
        if pct >= 0:
            alerts.append(
                f"📈 **{nice_date}** was an unusual spike — revenue **${revenue:,.0f}** "
                f"was **{pct:.0f}% above** a typical {weekday} (~${mean:,.0f})."
            )
        else:
            alerts.append(
                f"📉 **{nice_date}** was unusually slow — revenue **${revenue:,.0f}** "
                f"was **{abs(pct):.0f}% below** a typical {weekday} (~${mean:,.0f})."
            )
    return alerts


def compute_insights(data: pd.DataFrame, flags: dict) -> list:
    """Run every insight, skipping any that don't apply or error out."""
    builders = [
        lambda: insight_busiest_day(data),
        lambda: insight_peak_hours(data, flags["time"]),
        lambda: insight_pareto(data),
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
# 3B. AI CHART EXPLAINER  (the one feature that calls an outside service)
# ---------------------------------------------------------------------------
# Everything else in this app is free and runs entirely on your own computer.
# This one optional feature sends a *picture* of a chart to Google's Gemini
# vision API and gets back a plain-English description. It runs on Gemini's
# FREE tier (you just need a free Google AI Studio key), but two things are
# worth knowing: (1) your image is uploaded to Google to be read, and on the
# free tier Google may use it to improve their products; and (2) being a
# photo/screenshot reader, it DESCRIBES a chart — it does NOT recover the exact
# underlying numbers. For real number-crunching, use the main dashboard with a
# CSV/Excel file instead.
# ===========================================================================

# Fast "flash" Gemini vision models available on the free tier. We default to the
# first; the UI lets the user switch if one isn't available on their key's tier.
AI_VISION_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash"]
AI_VISION_MODEL = AI_VISION_MODELS[0]

# Image formats Gemini accepts inline (note: GIF is NOT supported), plus PDF.
AI_UPLOAD_TYPES = ["png", "jpg", "jpeg", "webp", "pdf"]

AI_CHART_PROMPT = (
    "You are a friendly data analyst helping a small-business owner who is NOT "
    "technical. Look at this chart/graph image and explain it in plain English.\n\n"
    "Structure your answer with these short, bolded sections:\n"
    "1. **What it shows** — the chart type and what each axis / slice represents.\n"
    "2. **The headline** — the single most important thing to notice.\n"
    "3. **Patterns & trends** — rises, falls, peaks, seasonality, and any outliers.\n"
    "4. **What to do about it** — 2-3 concrete, practical suggestions for the owner.\n\n"
    "Reference what you actually see (approximate values, axis labels, categories). "
    "IMPORTANT: you are reading a *picture* of a chart, so treat every number as an "
    "approximate estimate read off the image — say so plainly, and never invent "
    "precise figures the chart doesn't clearly show. If the image is not a chart or "
    "is too blurry/cropped to read, say that instead of guessing."
)


def image_media_type(filename: str) -> str:
    """Map an uploaded file's name to the MIME type the Gemini API expects.

    A PDF becomes `application/pdf`; images use an `image/*` type. Anything
    unrecognised is assumed to be a PNG (the most common screenshot format).
    """
    name = str(filename).lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if name.endswith(".webp"):
        return "image/webp"
    return "image/png"


def explain_chart_image(file_bytes: bytes, media_type: str, api_key: str,
                        model: str = AI_VISION_MODEL) -> str:
    """Send a chart image (or PDF) to Google's Gemini vision API; return its
    plain-English explanation as text.

    Kept free of Streamlit so it can be reasoned about / tested in isolation. It
    lets the SDK's typed errors (google.genai.errors.ClientError / ServerError)
    propagate so the UI layer can turn each into a friendly message. The API key
    is passed in explicitly and never hard-coded or logged.
    """
    from google import genai        # imported lazily: the rest of the app
    from google.genai import types  # doesn't need google-genai installed

    client = genai.Client(api_key=api_key)
    media_part = types.Part.from_bytes(data=file_bytes, mime_type=media_type)
    response = client.models.generate_content(
        model=model,
        contents=[media_part, AI_CHART_PROMPT],
    )
    # response.text is None (or raises) when the reply was blocked or held no text.
    try:
        text = response.text
    except Exception:
        text = None
    if not text:
        raise RuntimeError(
            "Gemini didn't return any text — the image may have been blocked or "
            "couldn't be read. Try a clearer screenshot or a different chart.")
    return text.strip()


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


@st.cache_data(show_spinner=False)
def read_excel_bytes(file_bytes: bytes) -> pd.DataFrame:
    """Read an uploaded Excel file. If it has several sheets, use the one with
    the most data (people often keep the sales on a busy sheet)."""
    xls = pd.ExcelFile(io.BytesIO(file_bytes))
    best, best_score = None, -1
    for sheet in xls.sheet_names:
        df = xls.parse(sheet)
        score = df.shape[0] * df.shape[1]
        if score > best_score:
            best, best_score = df, score
    return best if best is not None else pd.DataFrame()


def _frame_from_table(table: list) -> pd.DataFrame:
    """Turn one extracted table (list of rows) into a DataFrame; first row = header."""
    header = [(str(h).strip().replace("\n", " ") if h and str(h).strip() else f"col{i}")
              for i, h in enumerate(table[0])]
    return pd.DataFrame(table[1:], columns=header)


def _combine_same_shape(frames: list):
    """From many extracted tables, keep the largest group that shares a header
    (this stitches a transaction table that spans several pages)."""
    from collections import defaultdict
    if not frames:
        return None
    groups = defaultdict(list)
    for frame in frames:
        groups[tuple(frame.columns)].append(frame)
    best_key = max(groups, key=lambda k: sum(len(f) for f in groups[k]))
    return pd.concat(groups[best_key], ignore_index=True)


def _parse_text_rows(text: str):
    """Last resort: parse a plain-text PDF whose rows are separated by 2+ spaces
    or tabs (a printed transaction list that isn't a 'real' table)."""
    import re
    from collections import Counter
    rows = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        cells = [c.strip() for c in re.split(r"\s{2,}|\t", line) if c.strip()]
        if len(cells) >= 3:
            rows.append(cells)
    if len(rows) < 3:
        return None
    width = Counter(len(r) for r in rows).most_common(1)[0][0]  # most common column count
    rows = [r for r in rows if len(r) == width]
    if len(rows) < 3:
        return None
    return pd.DataFrame(rows[1:], columns=[str(h).strip() for h in rows[0]])


def _looks_like_real_table(df) -> bool:
    """True only for something that plausibly is a data table — used to reject
    the garbage a *chart/image* PDF produces (a chart's axis/tick labels get
    sliced into dozens of meaningless columns like col0, col1, ... col126)."""
    if df is None or df.shape[1] < 2 or len(df) < 1:
        return False
    # Real sales tables have a handful of columns, never dozens.
    if df.shape[1] > 20:
        return False
    # If (nearly) every column is an auto-generated placeholder, no header row
    # was found — i.e. there was no real table, just scattered text.
    placeholders = sum(1 for c in df.columns
                       if str(c).startswith("col") and str(c)[3:].isdigit())
    if placeholders >= max(2, df.shape[1] - 1):
        return False
    # A real table is mostly filled in; chart scraps are mostly blank.
    filled = df.map(lambda v: v is not None and str(v).strip() != "")
    if filled.to_numpy().mean() < 0.4:
        return False
    return True


@st.cache_data(show_spinner=False)
def read_pdf_bytes(file_bytes: bytes) -> pd.DataFrame:
    """Best-effort: pull a sales table out of a text-based PDF, trying three
    strategies in order of reliability:
      1. ruled tables (drawn grid lines),
      2. borderless / whitespace-aligned tables,
      3. a plain-text line parser.
    Scanned/image PDFs and reports with no transaction rows return an empty
    frame, and the caller shows a friendly message.
    """
    import pdfplumber

    line_cfg = {}  # pdfplumber default: detect columns from drawn lines
    text_cfg = {"vertical_strategy": "text", "horizontal_strategy": "text",
                "snap_tolerance": 4, "join_tolerance": 4}

    # Extract everything up front while the PDF is open (pages are lazy).
    frames_by_strategy = {0: [], 1: []}
    texts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            texts.append(page.extract_text() or "")
            for i, cfg in enumerate((line_cfg, text_cfg)):
                try:
                    tables = page.extract_tables(table_settings=cfg) or []
                except Exception:
                    tables = []
                for table in tables:
                    if table and len(table) >= 2 and len(table[0]) >= 2:
                        frames_by_strategy[i].append(_frame_from_table(table))

    def _tidy(df):
        return df.map(lambda v: str(v).strip() if v is not None else None)

    # Prefer ruled tables, then borderless tables, then the text parser -- but
    # only accept a candidate that actually looks like a data table (this is what
    # rejects a chart/image PDF instead of returning col0..col126 garbage).
    for i in (0, 1):
        combined = _combine_same_shape(frames_by_strategy[i])
        if combined is not None:
            combined = _tidy(combined)
            if _looks_like_real_table(combined):
                return combined
    parsed = _parse_text_rows("\n".join(texts))
    if parsed is not None:
        parsed = _tidy(parsed)
        if _looks_like_real_table(parsed):
            return parsed
    return pd.DataFrame()


def _pdf_text(line: str) -> str:
    """Turn an insight/alert string into reportlab paragraph markup: drop the
    leading emoji, escape XML special chars, and convert **bold** to <b>bold</b>."""
    import re
    from xml.sax.saxutils import escape as xml_escape
    line = re.sub(r"^[^\w$(*]+", "", line).strip()   # strip a leading emoji
    line = xml_escape(line)                           # neutralize & < > from names
    line = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", line)
    return line


def _pdf_chart(kind, data, brown="#6f4e37"):
    """Render one clean chart to a PNG buffer for the PDF.

    Uses matplotlib's object-oriented Figure API (NOT pyplot) so it's safe to
    call from Streamlit's background script-runner thread. pyplot keeps global
    state that isn't thread-safe and can crash the app (segfault) on reruns.
    """
    import io as _io
    from matplotlib.figure import Figure
    from matplotlib.ticker import FuncFormatter
    dollars = FuncFormatter(lambda v, _pos: f"${v:,.0f}")

    fig = Figure(figsize=(6.9, 1.7 if kind == "revenue" else 1.9))
    ax = fig.subplots()
    if kind == "revenue":
        series = data.set_index("transaction_date")["total_amount"].resample("MS").sum()
        ax.plot(series.index, series.values, color=brown, marker="o", ms=3, lw=1.8)
        ax.fill_between(series.index, series.values, color=brown, alpha=0.08)
        ax.set_title("Revenue by month", fontsize=11, loc="left",
                     fontweight="bold", color="#3a3a3a", pad=6)
        ax.yaxis.set_major_formatter(dollars)
        ax.grid(axis="y", alpha=0.18)
    else:  # "products"
        series = (data.groupby("product_name")["total_amount"].sum()
                  .sort_values(ascending=False).head(8).iloc[::-1])
        ax.barh(series.index, series.values, color=brown)
        ax.set_title("Top products by revenue", fontsize=11, loc="left",
                     fontweight="bold", color="#3a3a3a", pad=6)
        ax.xaxis.set_major_formatter(dollars)
        ax.grid(axis="x", alpha=0.18)

    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color("#cccccc")
    ax.tick_params(colors="#555555", labelsize=8)
    fig.tight_layout()
    buf = _io.BytesIO()
    fig.savefig(buf, format="png", dpi=180)  # Figure.savefig uses Agg for PNG
    buf.seek(0)
    return buf


@st.cache_data(show_spinner=False)
def build_pdf_summary(data: pd.DataFrame, kpis: tuple, insights: tuple,
                      alerts: tuple, date_label: str) -> bytes:
    """Render a clean, well-organized one-page PDF report: headline numbers, two
    charts, and detailed plain-English takeaways. Cached so it only rebuilds when
    the inputs change."""
    import io as _io
    from datetime import datetime
    import matplotlib
    matplotlib.use("Agg")  # headless backend, no display needed
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (HRFlowable, Image, Paragraph,
                                    SimpleDocTemplate, Spacer, Table, TableStyle)

    # Set fonts globally (config only — no pyplot, which isn't thread-safe here).
    matplotlib.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8})
    BROWN = colors.HexColor("#6f4e37")
    TAN = colors.HexColor("#c4a484")
    CREAM = colors.HexColor("#f6f1ea")
    GREY = colors.HexColor("#6b6b6b")
    DARK = colors.HexColor("#2b2b2b")
    total_revenue, n_orders, aov, orders_label = kpis

    # --- consistent, clean typography (all Helvetica) ---
    title = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=22,
                           textColor=BROWN, alignment=TA_LEFT, spaceAfter=1)
    subtitle = ParagraphStyle("subtitle", fontName="Helvetica", fontSize=10.5,
                              textColor=GREY, spaceAfter=2)
    section = ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=12,
                             textColor=BROWN, spaceBefore=9, spaceAfter=4)
    body = ParagraphStyle("body", fontName="Helvetica", fontSize=10.5,
                          textColor=DARK, leading=14, spaceAfter=3)
    bullet = ParagraphStyle("bullet", fontName="Helvetica", fontSize=10,
                            textColor=DARK, leading=12.8, leftIndent=14,
                            firstLineIndent=-9, spaceAfter=4)
    kpi_num = ParagraphStyle("kpi_num", fontName="Helvetica-Bold", fontSize=19,
                             textColor=BROWN, alignment=1)
    kpi_lab = ParagraphStyle("kpi_lab", fontName="Helvetica", fontSize=8.5,
                             textColor=GREY, alignment=1)
    footer = ParagraphStyle("footer", fontName="Helvetica-Oblique", fontSize=8,
                            textColor=GREY)

    story = [
        Paragraph("Sales Summary Report", title),
        Paragraph(date_label, subtitle),
        HRFlowable(width="100%", thickness=1.2, color=TAN, spaceBefore=3, spaceAfter=10),
        Paragraph(
            f"In this period the business took in <b>${total_revenue:,.0f}</b> across "
            f"<b>{n_orders:,}</b> {orders_label.lower().replace('total ', '')}, "
            f"for an average of <b>${aov:,.2f}</b> per order.", body),
        Spacer(1, 6),
    ]

    # --- KPI cards ---
    kpi_tbl = Table(
        [[Paragraph(f"${total_revenue:,.0f}", kpi_num),
          Paragraph(f"{n_orders:,}", kpi_num),
          Paragraph(f"${aov:,.2f}", kpi_num)],
         [Paragraph("Total revenue", kpi_lab),
          Paragraph(orders_label, kpi_lab),
          Paragraph("Avg order value", kpi_lab)]],
        colWidths=[2.32 * inch] * 3)
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.75, TAN),
        ("LINEBEFORE", (1, 0), (1, -1), 0.5, colors.white),
        ("LINEBEFORE", (2, 0), (2, -1), 0.5, colors.white),
        ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, 0), (-1, 0), 1),
        ("TOPPADDING", (0, 1), (-1, 1), 0), ("BOTTOMPADDING", (0, 1), (-1, 1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story += [kpi_tbl, Spacer(1, 8),
              Image(_pdf_chart("revenue", data), width=6.9 * inch, height=1.7 * inch),
              Spacer(1, 4),
              Image(_pdf_chart("products", data), width=6.9 * inch, height=1.9 * inch)]

    # --- detailed takeaways ---
    if insights:
        story.append(Paragraph("Key insights", section))
        for line in insights:
            story.append(Paragraph("&#8226;&#160;&#160;" + _pdf_text(line), bullet))
    if alerts:
        story.append(Paragraph("Unusual sales days", section))
        for line in list(alerts)[:2]:
            story.append(Paragraph("&#8226;&#160;&#160;" + _pdf_text(line), bullet))

    story += [
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.5, color=TAN, spaceAfter=4),
        Paragraph(f"Generated {datetime.now():%b %d, %Y at %I:%M %p} "
                  f"&#183; Sales Insights Dashboard", footer),
    ]

    out = _io.BytesIO()
    SimpleDocTemplate(out, pagesize=letter, title="Sales Summary Report",
                      topMargin=0.55 * inch, bottomMargin=0.5 * inch,
                      leftMargin=0.7 * inch, rightMargin=0.7 * inch).build(story)
    return out.getvalue()


def render_how_to(expanded: bool = False) -> None:
    """A friendly guide for non-technical owners on exporting & uploading data."""
    with st.expander("❓ How to use this — getting your sales into the dashboard",
                     expanded=expanded):
        st.markdown(
            """
**1. Export your sales from your point-of-sale (POS) system.**
It's usually under *Reports → Sales → Export* (or "Download CSV"):
- **Square:** Dashboard → Reports → Transactions → *Export*.
- **Toast / Clover / Lightspeed:** Reports → Sales → *Export to CSV*.
- **Shopify:** Analytics → Reports (or Orders → *Export*).
- **Just a spreadsheet (Excel / Google Sheets)?** Upload it directly, or File → *Save As / Download → CSV*.

**Accepted files:** **CSV** and **Excel (.xlsx)** are the most reliable. A
**text-based PDF** that contains a sales *table* also works — but scanned/image
PDFs and summary-only reports (just totals or a chart) can't be read.

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
    st.info("👈 To begin, upload your sales file — **CSV, Excel, or a text-based PDF** "
            "— using **Upload your sales file** in the sidebar.")
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


def find_gemini_key() -> str:
    """Look for a Google Gemini API key in Streamlit secrets, then the environment
    (checking both GEMINI_API_KEY and GOOGLE_API_KEY).

    Returns "" if none is set (the UI then offers a password box to type one in).
    Accessing st.secrets can raise when there's no secrets file at all, so it's
    guarded. The key is never written to disk or logged.
    """
    for name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        try:
            val = st.secrets.get(name, "")
        except Exception:
            val = ""  # no secrets.toml configured -> fall back to the environment
        if not val:
            val = os.environ.get(name, "")
        if val:
            return str(val)
    return ""


def render_ai_chart_explainer() -> None:
    """The '🤖 AI chart explainer' screen: upload a picture of a chart and have
    Google's Gemini describe it in plain English. This runs on Gemini's free
    tier, so it needs a (free) Google AI Studio key rather than a paid one."""
    st.title("🤖 AI Chart Explainer")
    st.markdown(
        "Upload a **picture of a chart or graph** — a screenshot, a photo, or a "
        "PDF page — and Google's **Gemini** AI will read it and explain what it "
        "shows in plain English, then suggest what to do about it."
    )

    st.info(
        "**Good news: this runs on Gemini's _free_ tier** — you just need a free "
        "Google AI Studio key (below, ~2 minutes). A few things to know:\n\n"
        "- 👀 It **describes** a chart in words; it **can't pull the exact numbers** "
        "back out of a picture. For real analysis of your figures, use the "
        "**📊 Sales dashboard** with a CSV or Excel file instead.\n"
        "- 🔐 Your image is **uploaded to Google** to be read, and on the free tier "
        "Google may use it to improve their products — so don't send anything "
        "confidential.\n"
        "- ⏳ The free tier has **rate limits** (a few requests per minute), so give "
        "it a moment between charts."
    )

    # --- API key: from secrets/env if present, otherwise ask for one ---
    key = find_gemini_key()
    if key:
        st.caption("🔑 Using the Google Gemini API key from this app's secrets / environment.")
    else:
        with st.expander("🔑 Get a free Google API key (required, ~2 minutes)",
                         expanded=True):
            st.markdown(
                "1. Open [Google AI Studio → API keys]"
                "(https://aistudio.google.com/app/apikey) and sign in with a Google "
                "account.\n"
                "2. Click **Create API key** — the free tier needs **no credit card**.\n"
                "3. Copy it and paste it below. It is **not stored** — it lives only "
                "in this browser session.\n\n"
                "*Deploying on Streamlit Community Cloud? Add it once under* "
                "**App → Settings → Secrets** *as* `GEMINI_API_KEY = \"...\"` *and "
                "it'll be picked up here automatically.*"
            )
            key = st.text_input("Google Gemini API key", type="password",
                                placeholder="AIza...")

    # --- Upload the chart ---
    uploaded = st.file_uploader(
        "Upload a chart image or PDF",
        type=AI_UPLOAD_TYPES,
        help="A screenshot or photo of a chart (PNG/JPG/WebP) works best. A PDF "
             "page is sent to Gemini as-is.",
    )
    if uploaded is not None:
        if image_media_type(uploaded.name) == "application/pdf":
            st.caption(f"📄 **{uploaded.name}** — will be sent to Gemini as a PDF.")
        else:
            st.image(uploaded.getvalue(), caption=uploaded.name, width="stretch")

    # --- Model (most people can leave this on the default) ---
    model = st.selectbox(
        "AI model", AI_VISION_MODELS, index=0,
        help="All are free-tier Gemini vision models. If the default isn't "
             "available on your key's tier, try another one.",
    )

    # --- Run it ---
    if st.button("✨ Explain this chart", type="primary", disabled=(uploaded is None)):
        if not key:
            st.error("Please add your free Google Gemini API key above first.")
            return
        try:
            from google.genai import errors as genai_errors
        except ModuleNotFoundError:
            st.error("The `google-genai` package isn't installed. Run "
                     "`pip install -r requirements.txt` and try again.")
            return

        try:
            with st.spinner("Gemini is reading your chart…"):
                answer = explain_chart_image(
                    uploaded.getvalue(), image_media_type(uploaded.name), key, model)
        except genai_errors.ClientError as exc:
            code = getattr(exc, "code", None)
            detail = getattr(exc, "message", None) or str(exc)
            if code == 429:
                st.error("⏳ You've hit the free-tier rate limit (or used up today's "
                         "quota). Wait a minute or two and try again.")
            elif code in (400, 401, 403):
                st.error("🔑 Your Google API key was rejected or isn't permitted. "
                         "Double-check it at aistudio.google.com/app/apikey.\n\n"
                         f"Details: {detail}")
            elif code == 404:
                st.error("That model isn't available on your key's tier — pick a "
                         "different one from the **AI model** dropdown above.\n\n"
                         f"Details: {detail}")
            else:
                st.error(f"Gemini rejected the request (HTTP {code}).\n\nDetails: {detail}")
            return
        except genai_errors.ServerError:
            st.error("🌐 Google's servers had a hiccup (or couldn't be reached). "
                     "Please try again in a moment.")
            return
        except RuntimeError as exc:  # e.g. blocked / empty response
            st.warning(str(exc))
            return
        except Exception as exc:  # never let it crash the app
            st.error(f"Something went wrong talking to the API: {exc}")
            return

        if answer:
            st.markdown("### 🧾 What Gemini sees")
            with st.container(border=True):
                st.markdown(escape_dollars(answer))
            st.caption("⚠️ These figures are **estimates read off the picture**. For "
                       "exact numbers, analyze the underlying CSV in the 📊 Sales "
                       "dashboard.")
        else:
            st.warning("Gemini didn't return any text for that image. Try another "
                       "chart, or a clearer screenshot.")


# ===========================================================================
# 5. THE PAGE
# ===========================================================================

def main() -> None:
    st.set_page_config(page_title="Sales Insights Dashboard", page_icon="📊",
                       layout="wide")

    # --- Sidebar: pick a mode -------------------------------------------------
    # Two tools in one app: the free/local sales dashboard (default), and an
    # optional AI chart explainer that reads a *picture* of a chart via Google's
    # Gemini API (free tier). Kept as a top-level switch so the explainer never
    # interferes with the core, no-API-needed experience.
    mode = st.sidebar.radio(
        "Mode",
        ["📊 Sales dashboard", "🤖 AI chart explainer"],
        index=0,
        key="app_mode",
        help="Sales dashboard: analyze a CSV/Excel/PDF of sales — free and local. "
             "AI chart explainer: read a *picture* of a chart using Google's Gemini "
             "API (free tier, needs a free Google AI Studio key).",
    )
    st.sidebar.divider()
    if mode.startswith("🤖"):
        render_ai_chart_explainer()
        return

    # --- Sidebar: choose the data source --------------------------------------
    st.sidebar.header("① Your data")
    uploaded = st.sidebar.file_uploader(
        "Upload your sales file", type=["csv", "tsv", "txt", "xlsx", "xls", "pdf"],
        help="CSV or Excel works best. A text-based PDF with a sales table can also "
             "be read (scanned or summary-only PDFs can't).",
    )

    # One-click "Load sample data" — lets anyone see the dashboard on real data,
    # even if their uploaded file can't be read. A fresh upload overrides it.
    st.session_state.setdefault("use_sample", False)
    if uploaded is not None and st.session_state.get("_last_upload") != uploaded.name:
        st.session_state.use_sample = False
        st.session_state["_last_upload"] = uploaded.name
    if os.path.exists(DEFAULT_FILE) and st.sidebar.button(
            "▶️ Load sample data", help="See the dashboard on built-in sample sales data."):
        st.session_state.use_sample = True

    def offer_sample():
        """Prominent fallback button shown on error screens."""
        if os.path.exists(DEFAULT_FILE) and st.button(
                "▶️  See it work with sample data instead", type="primary"):
            st.session_state.use_sample = True
            st.rerun()

    show_sample = st.session_state.use_sample or uploaded is None

    if uploaded is not None and not show_sample:
        name = uploaded.name.lower()
        file_bytes = uploaded.getvalue()
        try:
            if name.endswith((".xlsx", ".xls")):
                raw, source_kind = read_excel_bytes(file_bytes), "excel"
            elif name.endswith(".pdf"):
                raw, source_kind = read_pdf_bytes(file_bytes), "pdf"
            else:  # csv / tsv / txt
                raw, source_kind = read_csv_bytes(file_bytes), "csv"
        except Exception as exc:
            st.title("📊 Sales Insights Dashboard")
            st.error(
                f"Sorry, I couldn't read **{uploaded.name}**.\n\nDetails: {exc}\n\n"
                "Supported files: **CSV**, **Excel (.xlsx)**, or a **text-based PDF** "
                "that contains a sales table.")
            offer_sample()
            render_how_to(expanded=True)
            return
        source_label, is_sample = uploaded.name, False
    elif os.path.exists(DEFAULT_FILE):
        raw = read_csv_path(DEFAULT_FILE)
        source_label, is_sample, source_kind = f"{DEFAULT_FILE}", True, "sample"
    else:
        # No upload and no bundled file -> welcoming landing instead of an error.
        render_landing()
        return

    # --- Clean & validate -----------------------------------------------------
    data_all, report = prepare(raw)
    if data_all is None:
        st.title("📊 Sales Insights Dashboard")
        if source_kind == "pdf":
            # For a PDF, a validation failure almost always means it was a chart,
            # image, or summary report — not a real sales table. Say that plainly
            # instead of dumping garbage column names.
            st.warning(
                "**I couldn't find a data table in that PDF.** It looks like a "
                "**chart, image, or summary report** — and a *picture* of a chart "
                "isn't something I can read numbers back out of (the underlying data "
                "simply isn't in the file). I can only analyze a **list of individual "
                "sales** — rows that each have a date, an item, and an amount.\n\n"
                "**Please upload the underlying data instead:** a **CSV or Excel** "
                "export, or a PDF that contains a real table of transactions.")
        else:
            st.error(report["error"])
        offer_sample()
        render_how_to(expanded=True)
        return

    flags = detect_flags(data_all)
    render_load_summary(report, source_label, is_sample, flags)

    # --- Sidebar: date range (clear presets + optional custom calendar) -------
    from datetime import timedelta
    st.sidebar.header("② Date range")
    min_date = data_all["transaction_date"].min().date()
    max_date = data_all["transaction_date"].max().date()

    preset = st.sidebar.radio(
        "Show sales from",
        ["All time", "Last 30 days", "Last 90 days", "Last 12 months", "Custom range…"],
        index=0,
    )
    if preset == "All time":
        start_date, end_date = min_date, max_date
    elif preset == "Last 30 days":
        start_date, end_date = max(min_date, max_date - timedelta(days=29)), max_date
    elif preset == "Last 90 days":
        start_date, end_date = max(min_date, max_date - timedelta(days=89)), max_date
    elif preset == "Last 12 months":
        start_date, end_date = max(min_date, max_date - timedelta(days=364)), max_date
    else:  # Custom range… -> show the calendar only when it's actually needed
        picked = st.sidebar.date_input(
            "Pick a start and end date",
            value=(min_date, max_date),
            min_value=min_date, max_value=max_date, format="MM/DD/YYYY",
        )
        if not isinstance(picked, (list, tuple)) or len(picked) != 2:
            st.sidebar.info("👆 Pick **both** a start and an end date.")
            st.info("Choose a start date **and** an end date in the sidebar to continue.")
            return
        start_date, end_date = picked

    st.sidebar.caption(f"📅 Showing **{start_date:%b %d, %Y} → {end_date:%b %d, %Y}**")

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

    # --- Compute insights + alerts (shown on the page and put in the PDF) ----
    insights = compute_insights(data, flags)
    alerts = compute_outlier_alerts(data)

    # --- Download report (prominent section right under the numbers) ---------
    with st.container(border=True):
        st.markdown("#### 📄 One-page report")
        st.caption("Download a clean, printable PDF of this view — the headline "
                   "numbers, the two key charts, and the plain-English takeaways. "
                   "Perfect for sharing or emailing a co-owner.")
        try:
            pdf_bytes = build_pdf_summary(
                data,
                (total_revenue, n_orders, avg_order_value, orders_label),
                tuple(insights), tuple(alerts),
                f"{start_date:%b %d, %Y} – {end_date:%b %d, %Y}",
            )
            st.download_button(
                "⬇️  Download PDF summary",
                data=pdf_bytes,
                file_name=f"sales-summary_{start_date:%Y%m%d}_{end_date:%Y%m%d}.pdf",
                mime="application/pdf",
                type="primary",
            )
        except Exception as exc:  # never let the export crash the dashboard
            st.caption(f"(PDF export is unavailable right now: {exc})")

    # --- Key insights (the headline feature) ---------------------------------
    st.subheader("💡 Key insights")
    if insights:
        with st.container(border=True):
            for line in insights:
                # Escape '$' so Streamlit doesn't render dollar amounts as LaTeX math.
                st.markdown(escape_dollars(line))
    else:
        st.caption("Add category, customer, order-ID, or timestamp columns to your "
                   "data to unlock automatic insights.")

    # --- Automatic outlier / spike alerts ------------------------------------
    if alerts:
        st.subheader("🚨 Unusual sales days")
        with st.container(border=True):
            for alert in alerts:
                st.markdown(escape_dollars(alert))

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
