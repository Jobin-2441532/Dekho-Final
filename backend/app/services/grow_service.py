"""
Grow readiness/priority scoring.

Computes a user's investment-readiness state from their real financial data
(assets, goals, income, transactions) instead of a hardcoded flag. Output is
descriptive (how the user is doing, what to look at next) — never a specific
security recommendation, per SEBI (Investment Advisers) Regulations, 2013.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import User, Asset, SavingsGoal, Transaction, IncomeEntry

# Mirrors the income-band midpoints used in dashboard.get_profile
INCOME_RANGE_MONTHLY = {
    "0-3L": 20000,
    "3-5L": 35000,
    "5-10L": 65000,
    "10-15L": 105000,
    "15-25L": 165000,
    "25L+": 250000,
}

RISK_LABELS = {
    "low": "Cautious — prioritises safety over returns",
    "medium": "Balanced — comfortable with some ups and downs",
    "high": "Growth-focused — comfortable riding out volatility",
}

# Self-reported via the risk check (app/services/risk_service.py) — preferred
# over the legacy onboarding risk_comfort field when both are present.
RISK_TOLERANCE_LABELS = {
    "cautious": "Cautious — prioritises safety over returns",
    "balanced": "Balanced — comfortable with some ups and downs",
    "growth": "Growth-focused — comfortable riding out volatility",
}

LIQUID_ASSET_TYPES = {"cash", "savings"}

DISCLAIMER = (
    "Dekho is not a SEBI-registered investment adviser. This is educational "
    "information based on your own data, not personalized investment advice. "
    "Past performance does not guarantee future returns."
)


def financial_snapshot(db: Session, user: User) -> dict:
    """Shared, data-derived facts reused by both the Grow readiness view and
    the risk-capacity calculation — kept in one place so they never drift."""
    monthly_income = INCOME_RANGE_MONTHLY.get(user.income_range, user.monthly_budget or 0)
    monthly_expense_estimate = user.monthly_budget or (monthly_income * 0.7 if monthly_income else 0)

    liquid_total = sum(
        a.value for a in db.query(Asset).filter(Asset.user_id == user.id).all()
        if (a.type or "").lower() in LIQUID_ASSET_TYPES
    )
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user.id).all()
    emergency_goal = next((g for g in goals if "emergency" in (g.name or "").lower()), None)
    if emergency_goal:
        liquid_total += emergency_goal.current_amount

    months_covered = round(liquid_total / monthly_expense_estimate, 1) if monthly_expense_estimate else 0.0

    active_goals = [g for g in goals if g.status == "active"]

    six_months_ago = (datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%d")
    income_months = {
        row.date[:7]
        for row in db.query(IncomeEntry).filter(
            IncomeEntry.user_id == user.id, IncomeEntry.date >= six_months_ago
        ).all()
        if row.date
    }

    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    recent_spend = sum(
        t.amount
        for t in db.query(Transaction).filter(
            Transaction.user_id == user.id, Transaction.date >= thirty_days_ago
        ).all()
        if t.direction == "debit"
    )
    savings_rate = round((monthly_income - recent_spend) / monthly_income, 2) if monthly_income else None

    return {
        "monthly_income": monthly_income,
        "monthly_expense_estimate": monthly_expense_estimate,
        "liquid_total": liquid_total,
        "months_covered": months_covered,
        "active_goals": active_goals,
        "income_months": income_months,
        "savings_rate": savings_rate,
    }


def compute_grow_profile(db: Session, user: User) -> dict:
    snap = financial_snapshot(db, user)

    emergency_fund_met = snap["months_covered"] >= 3
    has_active_goals = len(snap["active_goals"]) > 0
    stable_income = len(snap["income_months"]) >= 6
    savings_rate = snap["savings_rate"]
    savings_rate_met = savings_rate is not None and savings_rate >= 0.2

    checklist = [
        {
            "key": "emergency_fund",
            "label": "3+ months emergency fund",
            "done": emergency_fund_met,
            "detail": f"{snap['months_covered']} months covered" if snap["monthly_expense_estimate"] else "Add income/budget info to calculate this",
            "progress": min(snap["months_covered"] / 3, 1) if snap["monthly_expense_estimate"] else 0,
        },
        {
            "key": "savings_rate",
            "label": "Consistent monthly savings > 20%",
            "done": savings_rate_met,
            "detail": f"{int(savings_rate * 100)}% saved in the last 30 days" if savings_rate is not None else "Log some transactions to calculate this",
            "progress": min(savings_rate / 0.2, 1) if savings_rate is not None else 0,
        },
        {
            "key": "income_stability",
            "label": "Income logged for 6+ months",
            "done": stable_income,
            "detail": f"{len(snap['income_months'])} of 6 months logged",
            "progress": min(len(snap["income_months"]) / 6, 1),
        },
        {
            "key": "active_goal",
            "label": "At least one active savings goal",
            "done": has_active_goals,
            "detail": f"{len(snap['active_goals'])} active goal(s)" if has_active_goals else "No goals set yet",
            "progress": 1.0 if has_active_goals else 0.0,
        },
    ]

    is_investment_eligible = emergency_fund_met and stable_income

    if not emergency_fund_met:
        priority = "emergency_fund"
    elif not has_active_goals:
        priority = "goal_planning"
    else:
        priority = "investment_education"

    surplus = max(snap["monthly_income"] - snap["monthly_expense_estimate"], 0)
    suggested_monthly_amount = round(surplus * 0.5, -2) if is_investment_eligible else 0

    return {
        "isInvestmentEligible": is_investment_eligible,
        "priority": priority,
        "monthlyIncome": snap["monthly_income"],
        "monthlyExpenseEstimate": round(snap["monthly_expense_estimate"], 2),
        "emergencyFund": {
            "monthsCovered": snap["months_covered"],
            "liquidTotal": round(snap["liquid_total"], 2),
        },
        "riskComfort": user.risk_comfort,
        "riskLabel": (
            RISK_TOLERANCE_LABELS.get((user.risk_tolerance or "").lower())
            or RISK_LABELS.get((user.risk_comfort or "").lower())
            or "Not set yet — take the risk check"
        ),
        "checklist": checklist,
        "suggestedMonthlyAmount": suggested_monthly_amount,
        "disclaimer": DISCLAIMER,
    }
