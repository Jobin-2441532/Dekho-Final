"""
Wealth (formerly "Assets") page — real net worth, category breakdown, and
month-over-month signals, computed from the user's own Asset and Transaction
rows instead of the page's previous hardcoded mock numbers.

Honesty constraints (matching Grow's approach): we don't have historical
balance snapshots, so "this month's movement" is never invented — it's either
a real transaction-derived proxy (clearly labeled as such) or omitted.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import User, Asset, Transaction
from app.services.grow_service import financial_snapshot

SAVINGS_ASSET_TYPES = {"cash", "savings"}
INVESTMENT_ASSET_TYPES = {"investment", "retirement", "mutual fund"}
OBLIGATION_CATEGORIES = {"Credit Card", "Loan EMI"}
INVESTMENT_CATEGORY = "Investment"

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _month_bounds(months_ago: int) -> tuple[str, str, str]:
    today = datetime.utcnow()
    y, m = today.year, today.month
    m -= months_ago
    while m <= 0:
        m += 12
        y -= 1
    start = f"{y}-{m:02d}-01"
    next_m, next_y = (m + 1, y) if m < 12 else (1, y + 1)
    end = f"{next_y}-{next_m:02d}-01"
    return start, end, f"{MONTH_NAMES[m - 1]}"


def _sum_debits(txs, categories: set[str] | None = None) -> float:
    return sum(
        t.amount for t in txs
        if t.direction == "debit" and (categories is None or (t.category in categories))
    )


def compute_wealth_profile(db: Session, user: User) -> dict:
    assets = db.query(Asset).filter(Asset.user_id == user.id).all()
    savings_total = sum(a.value for a in assets if (a.type or "").lower() in SAVINGS_ASSET_TYPES)
    investments_total = sum(a.value for a in assets if (a.type or "").lower() in INVESTMENT_ASSET_TYPES)
    net_worth = savings_total + investments_total

    snap = financial_snapshot(db, user)

    # Cashflow proxy for "this month's movement" — same honest definition used
    # elsewhere in the app (income - expenses), not a fabricated balance delta.
    this_month_start, this_month_end, _ = _month_bounds(0)
    month_txs = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.date >= this_month_start, Transaction.date < this_month_end,
    ).all()
    month_income = sum(t.amount for t in month_txs if t.direction == "credit")
    month_expenses = _sum_debits(month_txs)
    cashflow_delta = month_income - month_expenses

    investment_contribution = _sum_debits(month_txs, {INVESTMENT_CATEGORY})
    obligations_this_month = _sum_debits(month_txs, OBLIGATION_CATEGORIES)

    prev_month_start, prev_month_end, _ = _month_bounds(1)
    prev_month_txs = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.date >= prev_month_start, Transaction.date < prev_month_end,
    ).all()
    obligations_prev_month = _sum_debits(prev_month_txs, OBLIGATION_CATEGORIES)

    attention = None
    if obligations_this_month > 0 and obligations_prev_month > 0:
        pct = (obligations_this_month - obligations_prev_month) / obligations_prev_month * 100
        if pct >= 20:
            attention = f"Your credit card / EMI spending grew {round(pct)}% this month — worth reviewing before it compounds."

    # Narrative for the hero card
    if investment_contribution > 0 and cashflow_delta > 0:
        narrative = f"You added ₹{round(investment_contribution):,} to investments — a solid month."
    elif cashflow_delta > 0:
        narrative = "You came out ahead this month — income outpaced spending."
    elif net_worth == 0:
        narrative = "Add your savings and investments in Settings to see your real net worth here."
    else:
        narrative = "Spending outpaced income this month — a good one to review in Expenses."

    # 6-month cashflow trend, for the "performance" chart — real, not a fabricated net-worth history
    trend = []
    for i in range(5, -1, -1):
        start, end, label = _month_bounds(i)
        txs_i = db.query(Transaction).filter(
            Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end,
        ).all()
        income_i = sum(t.amount for t in txs_i if t.direction == "credit")
        expense_i = _sum_debits(txs_i)
        trend.append({"label": label, "value": round(income_i - expense_i, 2)})

    # Recent movement — real transactions in the categories that actually move net worth
    movement_txs = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.category.in_(OBLIGATION_CATEGORIES | {INVESTMENT_CATEGORY}),
    ).order_by(Transaction.date.desc()).limit(5).all()
    movement = [
        {
            "merchant": t.merchant or t.category,
            "category": t.category,
            "date": t.date,
            "amount": t.amount,
            "isPositive": t.category == INVESTMENT_CATEGORY,
        }
        for t in movement_txs
    ]

    return {
        "netWorth": round(net_worth, 2),
        "savings": {
            "total": round(savings_total, 2),
            "monthsCovered": snap["months_covered"],
        },
        "investments": {
            "total": round(investments_total, 2),
            "contributionThisMonth": round(investment_contribution, 2),
        },
        "liabilities": {
            "obligationsThisMonth": round(obligations_this_month, 2),
        },
        "cashflowDelta": round(cashflow_delta, 2),
        "narrative": narrative,
        "attention": attention,
        "trend": trend,
        "movement": movement,
        "hasAssets": len(assets) > 0,
    }
