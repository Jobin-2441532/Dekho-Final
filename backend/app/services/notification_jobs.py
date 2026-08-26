import calendar
import logging
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import User, Transaction, Budget, PushSubscription, NotificationLog
from app.services.push_service import send_push_to_user

logger = logging.getLogger("dekho.notifications")


def check_budget_alerts(db: Session, user: User) -> None:
    """
    Call this right after a transaction is created/updated.
    Fires a push the first time a category budget crosses 80% or 100% this month.
    """
    today = date.today()
    month_str = today.strftime("%Y-%m")
    budgets = db.query(Budget).filter(Budget.user_id == user.id, Budget.month == month_str).all()
    if not budgets:
        return

    start_date = f"{month_str}-01"
    _, last_day = calendar.monthrange(today.year, today.month)
    end_date = f"{month_str}-{last_day:02d}"

    for budget in budgets:
        if not budget.monthly_limit:
            continue
        # budget.category is stored as "Label|Emoji"; transactions store the plain label.
        category_label = budget.category.split("|")[0].strip()
        spend = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.category == category_label,
            Transaction.direction == "debit",
            Transaction.date >= start_date,
            Transaction.date <= end_date,
        ).scalar() or 0
        pct = spend / budget.monthly_limit

        # Check highest threshold first so crossing both at once only sends one push.
        for threshold in (1.0, 0.8):
            if pct < threshold:
                continue
            kind = f"budget_{budget.id}_{int(threshold * 100)}"
            already_sent = db.query(NotificationLog).filter(
                NotificationLog.user_id == user.id, NotificationLog.kind == kind
            ).first()
            if not already_sent:
                verb = "reached" if threshold == 1.0 else "hit 80% of"
                send_push_to_user(
                    db, user.id,
                    title="Budget Alert",
                    body=f"You've {verb} your {category_label} budget this month "
                         f"(₹{spend:,.0f} of ₹{budget.monthly_limit:,.0f}).",
                    url="/budgets",
                )
                db.add(NotificationLog(user_id=user.id, kind=kind))
                db.commit()
            break


def run_daily_notifications() -> None:
    """
    Scheduled once a day. For every user with an active push subscription:
    - if they haven't logged any transaction today, send a gentle nudge
    - on Sundays, also send a weekly spend recap
    Safe to run more than once a day — NotificationLog dedups by date-scoped kind.
    """
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        today = date.today()
        today_str = today.isoformat()
        user_ids = [row[0] for row in db.query(PushSubscription.user_id).distinct().all()]

        for user_id in user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                continue

            daily_kind = f"daily_nudge_{today_str}"
            if not db.query(NotificationLog).filter(NotificationLog.user_id == user_id, NotificationLog.kind == daily_kind).first():
                has_tx_today = db.query(Transaction).filter(
                    Transaction.user_id == user_id, Transaction.date == today_str
                ).first()
                if not has_tx_today:
                    send_push_to_user(
                        db, user_id,
                        title="Dekho",
                        body="Haven't logged anything today — a 30-second habit keeps your streak alive.",
                        url="/home",
                    )
                db.add(NotificationLog(user_id=user_id, kind=daily_kind))
                db.commit()

            if today.weekday() == 6:  # Sunday
                week_kind = f"weekly_recap_{today.isocalendar()[1]}_{today.year}"
                if not db.query(NotificationLog).filter(NotificationLog.user_id == user_id, NotificationLog.kind == week_kind).first():
                    week_start = today.replace(day=max(1, today.day - 6)).isoformat()
                    week_spend = db.query(func.sum(Transaction.amount)).filter(
                        Transaction.user_id == user_id,
                        Transaction.direction == "debit",
                        Transaction.date >= week_start,
                        Transaction.date <= today_str,
                    ).scalar() or 0
                    send_push_to_user(
                        db, user_id,
                        title="Your week with Dekho",
                        body=f"You spent ₹{week_spend:,.0f} this week. Tap to see the breakdown.",
                        url="/expenses",
                    )
                    db.add(NotificationLog(user_id=user_id, kind=week_kind))
                    db.commit()
    except Exception as e:
        logger.error(f"Daily notification job failed: {e}")
    finally:
        db.close()
