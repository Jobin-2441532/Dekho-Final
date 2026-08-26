"""
Risk-awareness check.

Separates risk CAPACITY (objective — can this person financially absorb a
loss, derived from their own data) from risk TOLERANCE (subjective — how do
they feel about volatility, self-reported), plus time horizon and experience.
This distinction is a standard piece of financial-planning literature and is
explicitly called out in the Grow section's design doc.

The output is a plain-language explanation for the user's own understanding —
never a product suitability score or a specific security recommendation.
"""
from sqlalchemy.orm import Session

from app.models import User
from app.services.grow_service import financial_snapshot, DISCLAIMER

TOLERANCE_LABELS = {
    "cautious": "Cautious — you'd rather avoid losses than chase higher returns",
    "balanced": "Balanced — you can tolerate some ups and downs for better long-term potential",
    "growth": "Growth-focused — you're comfortable with volatility in pursuit of higher returns",
}

EXPERIENCE_LABELS = {
    "new": "New to investing",
    "some": "Some experience",
    "experienced": "Experienced investor",
}

HORIZON_BUCKETS = [
    (0, 3, "short", "Short-term (under 3 years)"),
    (3, 7, "medium", "Medium-term (3–7 years)"),
    (7, 999, "long", "Long-term (7+ years)"),
]


def _horizon_bucket(years: int) -> tuple[str, str]:
    for lo, hi, key, label in HORIZON_BUCKETS:
        if lo <= years < hi:
            return key, label
    return "long", "Long-term (7+ years)"


def compute_risk_capacity(db: Session, user: User) -> dict:
    """Objective capacity to absorb loss, derived from the user's own data —
    not a self-reported opinion."""
    snap = financial_snapshot(db, user)
    months_covered = snap["months_covered"]
    stable_income = len(snap["income_months"]) >= 6
    savings_rate = snap["savings_rate"]

    points = 0
    if months_covered >= 6:
        points += 2
    elif months_covered >= 3:
        points += 1
    if stable_income:
        points += 1
    if savings_rate is not None and savings_rate >= 0.2:
        points += 1

    if points >= 3:
        label, key = "High", "high"
    elif points >= 1:
        label, key = "Medium", "medium"
    else:
        label, key = "Low", "low"

    return {
        "key": key,
        "label": label,
        "detail": f"Based on {months_covered} months of emergency-fund coverage, "
                  f"{'stable' if stable_income else 'not-yet-stable'} income history, and your recent savings rate.",
    }


def compute_risk_profile(db: Session, user: User) -> dict:
    capacity = compute_risk_capacity(db, user)

    tolerance_set = bool(user.risk_tolerance)
    tolerance_key = (user.risk_tolerance or "").lower()
    tolerance_label = TOLERANCE_LABELS.get(tolerance_key)

    experience_key = (user.risk_experience or "").lower()
    experience_label = EXPERIENCE_LABELS.get(experience_key)

    horizon_key = horizon_label = None
    if user.goal_horizon_years is not None:
        horizon_key, horizon_label = _horizon_bucket(user.goal_horizon_years)

    insights: list[str] = []

    if tolerance_set:
        if capacity["key"] == "high" and tolerance_key == "cautious":
            insights.append(
                "Your financial data suggests you could absorb more risk than you're choosing to — "
                "that's a perfectly reasonable, lower-stress choice. Capacity is what you could do; tolerance is what you're comfortable doing."
            )
        elif capacity["key"] == "low" and tolerance_key == "growth":
            insights.append(
                "You've said you're comfortable with market swings, but your financial cushion is still thin. "
                "Many people in this position build up their emergency fund first, so a downturn doesn't force a bad-timed withdrawal."
            )
        else:
            insights.append("Your stated comfort with risk and your financial capacity are broadly in line with each other.")
    else:
        insights.append("You haven't told us how you feel about market ups and downs yet — that's the missing piece below.")

    if horizon_key == "short":
        insights.append("With a shorter time horizon, lower-risk and more liquid options are usually more appropriate, regardless of risk tolerance.")
    elif horizon_key == "long":
        insights.append("A longer time horizon generally gives market-linked investments more room to recover from short-term dips.")

    if experience_key == "new":
        insights.append("Since you're new to investing, starting with simpler categories and learning as you go is a reasonable approach — there's no rush.")

    return {
        "capacity": capacity,
        "tolerance": {"key": tolerance_key or None, "label": tolerance_label, "isSet": tolerance_set},
        "experience": {"key": experience_key or None, "label": experience_label},
        "horizon": {"key": horizon_key, "label": horizon_label, "years": user.goal_horizon_years},
        "insights": insights,
        "isComplete": tolerance_set and bool(experience_key) and user.goal_horizon_years is not None,
        "disclaimer": DISCLAIMER,
    }


def save_risk_answers(db: Session, user: User, risk_tolerance: str, risk_experience: str, goal_horizon_years: int) -> None:
    user.risk_tolerance = risk_tolerance
    user.risk_experience = risk_experience
    user.goal_horizon_years = goal_horizon_years
    db.commit()
