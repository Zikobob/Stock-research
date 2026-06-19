"""
dashboard.py
============

An interactive sales dashboard for a small coffee shop, built with Streamlit.

Run it from this folder with:

    streamlit run dashboard.py

Streamlit will print a local web address (usually http://localhost:8501) and
open it in your browser. Leave the command running while you use the dashboard;
press Ctrl+C in the terminal to stop it.

By default it reads `sales_data.csv` (the fake data you generated). You can also
upload a different CSV from the sidebar to analyze a real business's sales — see
README.md for the exact column format a real file needs.
"""

import pandas as pd
import plotly.express as px
import streamlit as st

# ---------------------------------------------------------------------------
# Page setup
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Coffee Shop Sales Dashboard",
    page_icon="☕",
    layout="wide",
)

DEFAULT_FILE = "sales_data.csv"
COFFEE_BROWN = "#6f4e37"

# The columns the dashboard understands. Only the first four are strictly
# required; the rest unlock extra charts when present.
REQUIRED_COLUMNS = ["transaction_date", "product_name", "quantity", "unit_price"]
WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday",
                 "Friday", "Saturday", "Sunday"]


# ---------------------------------------------------------------------------
# Loading & preparing the data
# ---------------------------------------------------------------------------

@st.cache_data
def load_default_file(path: str) -> pd.DataFrame:
    """Read the bundled sample CSV. Cached so the app stays fast."""
    return pd.read_csv(path)


def prepare(raw: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and validate a raw sales table so the rest of the app can trust it.

    Raises a friendly error (and stops the app) if required columns are missing.
    Fills in `total_amount` if the file doesn't already have it.
    """
    df = raw.copy()
    df.columns = [str(c).strip() for c in df.columns]  # tidy header whitespace

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        st.error(
            "Your file is missing these required column(s): "
            f"**{', '.join(missing)}**.\n\n"
            "Required columns are: "
            "`transaction_date`, `product_name`, `quantity`, `unit_price`.\n\n"
            "Optional columns that add more charts: "
            "`total_amount`, `product_category`, `customer_id`.\n\n"
            "See README.md for the full format."
        )
        st.stop()

    # Parse dates; drop rows whose date can't be understood.
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
    bad_dates = df["transaction_date"].isna().sum()
    if bad_dates:
        st.warning(f"Ignored {bad_dates} row(s) with an unreadable transaction_date.")
        df = df.dropna(subset=["transaction_date"])

    # Make the numeric columns numeric (real spreadsheets are often messy).
    for col in ["quantity", "unit_price"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Compute total_amount if it isn't supplied.
    if "total_amount" not in df.columns:
        df["total_amount"] = df["quantity"] * df["unit_price"]
    else:
        df["total_amount"] = pd.to_numeric(df["total_amount"], errors="coerce")

    df = df.dropna(subset=["quantity", "unit_price", "total_amount"])
    return df


# Sidebar: let the user upload their own file, otherwise use the sample.
st.sidebar.header("Data source")
uploaded = st.sidebar.file_uploader("Upload your own sales CSV", type="csv")

if uploaded is not None:
    raw_df = pd.read_csv(uploaded)
    source_label = uploaded.name
else:
    raw_df = load_default_file(DEFAULT_FILE)
    source_label = f"{DEFAULT_FILE} (sample data)"

df = prepare(raw_df)
st.sidebar.caption(f"Showing: **{source_label}**")

has_category = "product_category" in df.columns
has_customer = "customer_id" in df.columns


# ---------------------------------------------------------------------------
# Sidebar: date-range filter
# ---------------------------------------------------------------------------

st.sidebar.header("Filter")
min_date = df["transaction_date"].min().date()
max_date = df["transaction_date"].max().date()

date_range = st.sidebar.date_input(
    "Date range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date,
)

# While the user is mid-selection, date_input can return just one date.
if not isinstance(date_range, (list, tuple)) or len(date_range) != 2:
    st.info("Pick a start date and an end date in the sidebar to continue.")
    st.stop()

start_date, end_date = date_range
mask = (df["transaction_date"].dt.date >= start_date) & \
       (df["transaction_date"].dt.date <= end_date)
data = df.loc[mask]


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

st.title("☕ Coffee Shop Sales Dashboard")
st.caption(f"Showing {start_date:%b %d, %Y} – {end_date:%b %d, %Y}")

if data.empty:
    st.warning("No transactions fall in this date range. Try widening the filter.")
    st.stop()


# ---------------------------------------------------------------------------
# Top row: the headline numbers (KPIs)
# ---------------------------------------------------------------------------

total_revenue = data["total_amount"].sum()
total_transactions = len(data)
avg_order_value = total_revenue / total_transactions

kpi1, kpi2, kpi3 = st.columns(3)
kpi1.metric("Total Revenue", f"${total_revenue:,.2f}")
kpi2.metric("Total Transactions", f"{total_transactions:,}")
kpi3.metric("Average Order Value", f"${avg_order_value:,.2f}")

st.divider()


# ---------------------------------------------------------------------------
# Revenue over time (by month)
# ---------------------------------------------------------------------------

st.subheader("Revenue over time")
monthly = (
    data.set_index("transaction_date")["total_amount"]
    .resample("MS")             # "MS" = group by month start
    .sum()
    .reset_index()
)
fig_time = px.line(
    monthly, x="transaction_date", y="total_amount", markers=True,
    labels={"transaction_date": "Month", "total_amount": "Revenue ($)"},
)
fig_time.update_traces(line_color=COFFEE_BROWN)
st.plotly_chart(fig_time, width="stretch")


# ---------------------------------------------------------------------------
# Top products  +  revenue by category (side by side)
# ---------------------------------------------------------------------------

left, right = st.columns(2)

with left:
    st.subheader("Top products by revenue")
    top_products = (
        data.groupby("product_name")["total_amount"].sum()
        .sort_values(ascending=False).head(10)
        .reset_index()
    )
    fig_products = px.bar(
        top_products, x="total_amount", y="product_name", orientation="h",
        labels={"total_amount": "Revenue ($)", "product_name": ""},
    )
    fig_products.update_traces(marker_color=COFFEE_BROWN)
    fig_products.update_layout(yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig_products, width="stretch")

with right:
    st.subheader("Revenue by category")
    if has_category:
        by_category = (
            data.groupby("product_category")["total_amount"].sum()
            .sort_values(ascending=False).reset_index()
        )
        fig_cat = px.pie(
            by_category, names="product_category", values="total_amount", hole=0.5,
        )
        fig_cat.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(fig_cat, width="stretch")
    else:
        st.info("Add a `product_category` column to see this chart.")


# ---------------------------------------------------------------------------
# Busiest weekdays  +  repeat vs one-time customers (side by side)
# ---------------------------------------------------------------------------

left2, right2 = st.columns(2)

with left2:
    st.subheader("Busiest days of the week")
    weekday_counts = (
        data["transaction_date"].dt.day_name()
        .value_counts()
        .reindex(WEEKDAY_ORDER, fill_value=0)
    )
    weekday_df = pd.DataFrame({
        "Day": weekday_counts.index,
        "Transactions": weekday_counts.values,
    })
    fig_week = px.bar(
        weekday_df, x="Day", y="Transactions",
        labels={"Transactions": "Transactions"},
    )
    fig_week.update_traces(marker_color=COFFEE_BROWN)
    st.plotly_chart(fig_week, width="stretch")

with right2:
    st.subheader("Repeat vs. one-time customers")
    if has_customer:
        visits = data["customer_id"].value_counts()
        repeat_count = int((visits > 1).sum())
        one_time_count = int((visits == 1).sum())

        c1, c2 = st.columns(2)
        c1.metric("Repeat customers", f"{repeat_count:,}")
        c2.metric("One-time customers", f"{one_time_count:,}")

        cust_df = pd.DataFrame({
            "Customer type": ["Repeat", "One-time"],
            "Count": [repeat_count, one_time_count],
        })
        fig_cust = px.pie(
            cust_df, names="Customer type", values="Count", hole=0.5,
            color="Customer type",
            color_discrete_map={"Repeat": COFFEE_BROWN, "One-time": "#c4a484"},
        )
        fig_cust.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(fig_cust, width="stretch")
    else:
        st.info("Add a `customer_id` column to see repeat-customer analysis.")


# ---------------------------------------------------------------------------
# Raw data peek (handy while learning)
# ---------------------------------------------------------------------------

with st.expander("See the underlying transactions"):
    st.dataframe(
        data.sort_values("transaction_date", ascending=False),
        width="stretch",
    )
