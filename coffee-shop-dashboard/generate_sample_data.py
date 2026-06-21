"""
generate_sample_data.py
========================

Creates a realistic *fake* sales dataset for a small coffee shop and saves it
to `sales_data.csv`. This is the data the dashboard reads.

You only need to run this ONCE (the CSV is already included in this folder),
but you can re-run it any time to regenerate the data:

    python generate_sample_data.py

The patterns are intentionally realistic:
  - ~2,000 orders spread over ~18 months (each order has 1-3 items, so the
    file ends up with a few thousand line-item rows)
  - every order has a timestamp, so there's a realistic morning rush
  - items in the same order share a transaction_id, so "what gets bought
    together" can be analysed
  - weekends are busier than weekdays
  - a summer dip and a holiday (Nov/Dec) bump in sales
  - hot drinks sell more in winter, cold drinks more in summer
  - a few products (lattes, drip coffee) sell far more than niche items
  - the business grows slowly over time
  - some customers come back many times ("regulars") while most visit once

Every "knob" you might want to change lives in the CONFIG section below.
"""

from datetime import date, datetime, time, timedelta

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# CONFIG  (change anything here, then re-run the script)
# ---------------------------------------------------------------------------

SEED = 42                  # makes the random data reproducible (same every run)
TARGET_TRANSACTIONS = 2000 # roughly how many *orders* we want
END_DATE = date(2026, 6, 15)
START_DATE = END_DATE - timedelta(days=548)  # ~18 months of history
N_CUSTOMERS = 1000         # size of the customer pool (drives repeat customers)
FRAC_REGULARS = 0.15       # fraction of customers who are loyal "regulars"
REGULAR_BOOST = 15         # how much more often a regular visits vs. a casual
OUTPUT_FILE = "sales_data.csv"

# The menu. Each product has:
#   name, category, unit price ($), popularity weight, season preference
# "popularity weight" is relative: a Latte (12) sells ~6x as often as a Panini (2).
# "season" tells us whether it's a hot drink, cold drink, or neutral item.
PRODUCTS = [
    # name,                     category,      price,  weight, season
    ("Drip Coffee",             "Hot Coffee",   2.75,   10,    "hot"),
    ("Latte",                   "Hot Coffee",   4.50,   12,    "hot"),
    ("Cappuccino",              "Hot Coffee",   4.25,    7,    "hot"),
    ("Americano",               "Hot Coffee",   3.50,    6,    "hot"),
    ("Espresso",                "Hot Coffee",   2.95,    4,    "hot"),
    ("Mocha",                   "Hot Coffee",   4.95,    5,    "hot"),
    ("Flat White",              "Hot Coffee",   4.50,    4,    "hot"),
    ("Iced Latte",              "Cold Coffee",  4.75,    9,    "cold"),
    ("Cold Brew",               "Cold Coffee",  4.50,    8,    "cold"),
    ("Iced Americano",          "Cold Coffee",  3.75,    4,    "cold"),
    ("Frappe",                  "Cold Coffee",  5.50,    5,    "cold"),
    ("Chai Latte",              "Tea",          4.25,    4,    "hot"),
    ("Matcha Latte",            "Tea",          4.95,    3,    "neutral"),
    ("Hot Tea",                 "Tea",          2.95,    3,    "hot"),
    ("Iced Tea",                "Tea",          3.25,    3,    "cold"),
    ("Croissant",               "Bakery",       3.25,    7,    "neutral"),
    ("Blueberry Muffin",        "Bakery",       3.50,    5,    "neutral"),
    ("Chocolate Chip Cookie",   "Bakery",       2.50,    6,    "neutral"),
    ("Bagel with Cream Cheese", "Bakery",       3.75,    4,    "neutral"),
    ("Cinnamon Roll",           "Bakery",       4.25,    3,    "neutral"),
    ("Avocado Toast",           "Food",         7.50,    3,    "neutral"),
    ("Breakfast Sandwich",      "Food",         6.50,    4,    "neutral"),
    ("Grilled Panini",          "Food",         7.95,    2,    "neutral"),
    ("Bottled Water",           "Other",        2.00,    3,    "neutral"),
    ("Hot Chocolate",           "Other",        3.75,    3,    "hot"),
]

# How busy each month is, relative to a normal month (1.0).
# Summer (Jun-Aug) dips; the Nov-Dec holidays are the busiest.
SEASONAL_VOLUME = {
    1: 1.05, 2: 1.00, 3: 1.00, 4: 0.98, 5: 0.95, 6: 0.85,
    7: 0.80, 8: 0.82, 9: 1.00, 10: 1.08, 11: 1.12, 12: 1.15,
}

# How busy each weekday is, relative to a normal day (1.0). Monday=0 ... Sunday=6.
# Weekends are clearly busier.
WEEKDAY_VOLUME = {0: 0.95, 1: 0.95, 2: 1.00, 3: 1.00, 4: 1.10, 5: 1.45, 6: 1.35}

# How many items are in one order (most people just grab a single thing).
ITEMS_PER_ORDER = [1, 2, 3]
ITEMS_PER_ORDER_PROBS = [0.60, 0.30, 0.10]

# How busy each hour of the day is (the shop is open ~6am-8pm). There's a
# strong morning rush that peaks around 8am, plus a smaller lunch bump.
HOURLY_VOLUME = {
    6: 2, 7: 6, 8: 11, 9: 9, 10: 6, 11: 5, 12: 7,
    13: 6, 14: 4, 15: 3, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1,
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def season_factor(season: str, month: int) -> float:
    """Boost or shrink a product's chance of selling based on the time of year."""
    summer = month in (6, 7, 8)
    warm_shoulder = month in (5, 9)
    winter = month in (12, 1, 2)

    if season == "hot":
        if summer:
            return 0.6   # nobody wants a hot coffee in July
        if winter:
            return 1.3
        return 1.0
    if season == "cold":
        if summer:
            return 1.8   # iced drinks fly off the shelf
        if winter:
            return 0.5
        if warm_shoulder:
            return 1.2
        return 1.0
    return 1.0           # neutral items (food, pastries) don't care about season


def build_customer_pool(rng: np.random.Generator) -> tuple[list[str], np.ndarray]:
    """
    Create customer IDs and a "how often do they visit" weight for each one.

    We split the pool into two tiers so the data looks like a real shop:
      - a small group of loyal "regulars" who come back again and again
      - a large group of "casuals" who visit once or a handful of times
    The result is a realistic mix where roughly half of all named customers
    only ever visit once, yet the regulars still drive most of the sales.
    """
    ids = [f"C{n:04d}" for n in range(1, N_CUSTOMERS + 1)]
    weights = rng.gamma(shape=0.8, scale=1.0, size=N_CUSTOMERS)

    n_regulars = int(N_CUSTOMERS * FRAC_REGULARS)
    weights[:n_regulars] *= REGULAR_BOOST  # make regulars far more likely to appear

    weights = weights / weights.sum()  # turn into probabilities that sum to 1
    return ids, weights


# ---------------------------------------------------------------------------
# Main generation logic
# ---------------------------------------------------------------------------

def generate() -> pd.DataFrame:
    rng = np.random.default_rng(SEED)

    # Pre-compute product info as parallel arrays (fast + easy to index).
    names = [p[0] for p in PRODUCTS]
    categories = {p[0]: p[1] for p in PRODUCTS}
    prices = {p[0]: p[2] for p in PRODUCTS}
    base_weights = np.array([p[3] for p in PRODUCTS], dtype=float)
    seasons = [p[4] for p in PRODUCTS]

    customer_ids, customer_weights = build_customer_pool(rng)

    # Every calendar day in our window.
    n_days = (END_DATE - START_DATE).days + 1
    all_days = [START_DATE + timedelta(days=i) for i in range(n_days)]

    # Step 1: figure out the *expected* number of transactions for each day,
    # combining season, weekday, and a gentle upward growth trend.
    expected = []
    for i, day in enumerate(all_days):
        growth = 1.0 + 0.15 * (i / n_days)          # +15% over the whole period
        lam = (SEASONAL_VOLUME[day.month]
               * WEEKDAY_VOLUME[day.weekday()]
               * growth)
        expected.append(lam)
    expected = np.array(expected)

    # Scale so the totals land near TARGET_TRANSACTIONS.
    expected *= TARGET_TRANSACTIONS / expected.sum()

    # Step 2: draw an actual (whole-number) count per day, with realistic noise.
    daily_counts = rng.poisson(expected)

    # Hour-of-day choices, turned into probabilities.
    hours = list(HOURLY_VOLUME.keys())
    hour_probs = np.array([HOURLY_VOLUME[h] for h in hours], dtype=float)
    hour_probs /= hour_probs.sum()

    # Step 3: build the orders. Each order turns into 1-3 rows (one per item),
    # and every row in an order shares the same transaction_id, timestamp, and
    # customer_id -- exactly how a real point-of-sale export looks.
    rows = []
    order_number = 0
    for day, n_orders in zip(all_days, daily_counts):
        if n_orders == 0:
            continue

        # Season-adjust product popularity for this month, then normalize.
        month_weights = base_weights * np.array(
            [season_factor(s, day.month) for s in seasons]
        )
        month_probs = month_weights / month_weights.sum()

        # Make the random choices for all of today's orders at once (fast).
        order_customers = rng.choice(customer_ids, size=n_orders, p=customer_weights)
        order_hours = rng.choice(hours, size=n_orders, p=hour_probs)
        order_sizes = rng.choice(
            ITEMS_PER_ORDER, size=n_orders, p=ITEMS_PER_ORDER_PROBS
        )

        for k in range(n_orders):
            order_number += 1
            txn_id = f"T{order_number:06d}"
            customer = order_customers[k]
            minute = int(rng.integers(0, 60))
            timestamp = datetime.combine(day, time(int(order_hours[k]), minute))

            # The order's distinct items (no duplicate items within one order).
            n_items = min(int(order_sizes[k]), len(names))
            item_indices = rng.choice(
                len(names), size=n_items, replace=False, p=month_probs
            )

            for prod_idx in item_indices:
                name = names[prod_idx]
                unit_price = prices[name]
                qty = int(rng.choice([1, 2], p=[0.9, 0.1]))
                rows.append({
                    "transaction_id": txn_id,
                    "transaction_date": timestamp.isoformat(sep=" "),
                    "product_name": name,
                    "product_category": categories[name],
                    "quantity": qty,
                    "unit_price": round(unit_price, 2),
                    "total_amount": round(unit_price * qty, 2),
                    "customer_id": customer,
                })

    df = pd.DataFrame(rows)
    df = df.sort_values(["transaction_date", "transaction_id"]).reset_index(drop=True)
    return df


def main() -> None:
    df = generate()
    df.to_csv(OUTPUT_FILE, index=False)

    # Print a quick summary so you can sanity-check the data.
    n_orders = df["transaction_id"].nunique()
    revenue = df["total_amount"].sum()
    # Count visits per customer by distinct orders (not line items).
    visits_per_customer = df.groupby("customer_id")["transaction_id"].nunique()
    repeat = (visits_per_customer > 1).sum()
    one_time = (visits_per_customer == 1).sum()

    print(f"Wrote {len(df):,} line items across {n_orders:,} orders to {OUTPUT_FILE}")
    print(f"  Date range:     {df['transaction_date'].min()} -> {df['transaction_date'].max()}")
    print(f"  Total revenue:  ${revenue:,.2f}")
    print(f"  Avg order value:${revenue / n_orders:,.2f}")
    print(f"  Unique products:{df['product_name'].nunique()}")
    print(f"  Customers:      {df['customer_id'].nunique()} "
          f"({repeat} repeat, {one_time} one-time)")
    print("\nFirst few rows:")
    print(df.head(8).to_string(index=False))


if __name__ == "__main__":
    main()
