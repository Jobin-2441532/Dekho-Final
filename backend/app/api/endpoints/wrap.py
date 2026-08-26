import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.core.database import get_db
from app.models import Transaction, SavingsGoal, User
from app.api.endpoints.auth import get_current_user
from datetime import datetime, timezone
import calendar
from app.services.insight_engine_v2 import DekhoInsightEngine, UserData

logger = logging.getLogger("dekho.wrap")
router = APIRouter()
engine = DekhoInsightEngine()

@router.get("")
def get_monthly_wrap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    year: int = Query(..., description="Year, e.g. 2025"),
    month: int = Query(..., description="Month, 1-12"),
):
    # Calculate date ranges
    _, last_day = calendar.monthrange(year, month)
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{last_day:02d}"

    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    _, prev_last_day = calendar.monthrange(prev_year, prev_month)
    prev_start_date = f"{prev_year}-{prev_month:02d}-01"
    prev_end_date = f"{prev_year}-{prev_month:02d}-{prev_last_day:02d}"

    # Get transactions for current and previous month
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).all()

    prev_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= prev_start_date,
        Transaction.date <= prev_end_date
    ).all()

    # 1. Income
    curr_income = sum(t.amount for t in txs if t.direction == "credit")
    prev_income = sum(t.amount for t in prev_txs if t.direction == "credit")

    # 2. Expenses & Top Category
    curr_expenses = sum(t.amount for t in txs if t.direction == "debit")
    prev_expenses = sum(t.amount for t in prev_txs if t.direction == "debit")

    cat_spend = {}
    merchants = {}
    weekday_spend = [0.0] * 7  # Monday=0 .. Sunday=6
    biggest_spend = {"merchant": "None", "amount": 0}

    for t in txs:
        if t.direction == "debit":
            cat_spend[t.category or "Others"] = cat_spend.get(t.category or "Others", 0) + t.amount
            if t.merchant:
                merchants[t.merchant] = merchants.get(t.merchant, 0) + 1
            if t.amount > biggest_spend["amount"]:
                biggest_spend = {"merchant": t.merchant or "Unknown", "amount": t.amount}
            try:
                weekday_spend[datetime.strptime(t.date, "%Y-%m-%d").weekday()] += t.amount
            except (ValueError, TypeError):
                pass

    # Previous month's category totals, for the category-shift comparison below
    prev_cat_spend = {}
    for t in prev_txs:
        if t.direction == "debit":
            prev_cat_spend[t.category or "Others"] = prev_cat_spend.get(t.category or "Others", 0) + t.amount

    top_category = max(cat_spend.items(), key=lambda x: x[1]) if cat_spend else ("None", 0)
    top_merchant = max(merchants.items(), key=lambda x: x[1]) if merchants else ("None", 0)

    # Top 4 categories this month, for the Wrap's category bar-chart slide
    category_breakdown = [
        {"category": c, "amount": round(amt, 2)}
        for c, amt in sorted(cat_spend.items(), key=lambda x: -x[1])[:4]
    ]

    # Day-of-week pattern — which weekday carries the most spend
    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    top_weekday_data = {"day": "None", "amount": 0, "pct_of_total": 0}
    if any(weekday_spend):
        top_idx = max(range(7), key=lambda i: weekday_spend[i])
        top_amt = weekday_spend[top_idx]
        top_weekday_data = {
            "day": weekday_names[top_idx],
            "amount": round(top_amt, 2),
            "pct_of_total": round(top_amt / curr_expenses * 100) if curr_expenses > 0 else 0,
        }

    # Category shift vs last month — the category with the biggest change either way
    category_shift = {"category": "None", "delta": 0, "is_new": False, "direction": "up"}
    all_cats = set(cat_spend) | set(prev_cat_spend)
    if all_cats:
        deltas = {c: cat_spend.get(c, 0) - prev_cat_spend.get(c, 0) for c in all_cats}
        shift_cat = max(deltas, key=lambda c: abs(deltas[c]))
        if abs(deltas[shift_cat]) > 0:
            category_shift = {
                "category": shift_cat,
                "delta": round(abs(deltas[shift_cat]), 2),
                "is_new": prev_cat_spend.get(shift_cat, 0) == 0,
                "direction": "up" if deltas[shift_cat] > 0 else "down",
            }

    # 3. Savings Rate
    savings_rate = 0
    if curr_income > 0:
        savings_rate = round(max(0, (curr_income - curr_expenses) / curr_income), 2)
    
    # Check user's target savings goal if available (we will default to 0.20 for now)
    target_rate = 0.20

    # 6. Net Worth Delta — cashflow proxy (income - expenses) for this month.
    net_worth_delta = curr_income - curr_expenses

    # 8. Goals
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    goals_data = []
    if goals:
        top_goal = goals[0] # simplification
        goals_data = [{
            "name": top_goal.name,
            "progress": min(1.0, top_goal.current_amount / top_goal.target_amount) if top_goal.target_amount else 0,
            "added": top_goal.auto_pay_amount or 0
        }]

    # 7. Dekho Says (AI Narrative)
    dekho_says = "You had a quiet month."
    personality = "Balanced Saver"

    try:
        if txs:
            month_vs_last_month_pct = (
                ((curr_expenses - prev_expenses) / prev_expenses) * 100
                if prev_expenses > 0 else 0.0
            )
            created_at = current_user.created_at
            if created_at and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            days_on_app = max(0, (datetime.now(timezone.utc) - created_at).days) if created_at else 30

            user_data = UserData(
                name=current_user.name or "there",
                days_on_app=days_on_app,
                month_total=curr_expenses,
                month_top_category=top_category[0],
                month_top_amount=top_category[1],
                month_vs_last_month_pct=month_vs_last_month_pct,
                last_month_total=prev_expenses,
            )
            insights = engine.generate_all(user_data)

            hero = insights.get("expenses", {}).get("hero_insight")
            if hero:
                lines = hero.get("lines") or []
                extra = " ".join(lines)
                dekho_says = f"{hero['headline']} {extra}".strip()

            identity = insights.get("behavior", {}).get("spending_identity")
            if identity and identity.get("identity"):
                personality = identity["identity"]
    except Exception as e:
        logger.warning(f"Insight engine failed for wrap, using fallback narrative: {e}")

    month_name = calendar.month_name[month]

    return {
        "period": f"{month_name} {year}",
        "income": {
            "total": curr_income,
            "vs_last": curr_income - prev_income
        },
        "expenses": {
            "total": curr_expenses,
            "top_category": top_category[0],
            "top_amount": top_category[1],
            "category_breakdown": category_breakdown
        },
        "savings_rate": savings_rate,
        "savings_goal_rate": target_rate,
        "biggest_spend": biggest_spend,
        "top_merchant": {
            "name": top_merchant[0],
            "count": top_merchant[1]
        },
        "net_worth_delta": net_worth_delta,
        "top_weekday": top_weekday_data,
        "category_shift": category_shift,
        "goals": goals_data,
        "dekho_says": dekho_says,
        "personality": personality
    }
