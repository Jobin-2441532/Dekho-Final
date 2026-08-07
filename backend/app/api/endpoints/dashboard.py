from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.core.database import get_db
from app.models import Transaction, SavingsGoal, User, Asset, Recommendation
from app.api.endpoints.auth import get_current_user

router = APIRouter()

# ---------------------------------------------------------------------------
# Transactions — with pagination + date range filtering
# ---------------------------------------------------------------------------
@router.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Number of records to skip (for pagination)"),
    limit: int = Query(50, ge=1, le=500, description="Max records to return"),
    from_date: Optional[str] = Query(None, description="Filter from date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="Filter to date YYYY-MM-DD"),
    category: Optional[str] = Query(None, description="Filter by category"),
    direction: Optional[str] = Query(None, description="Filter by direction: debit | credit"),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc())

    if from_date:
        q = q.filter(Transaction.date >= from_date)
    if to_date:
        q = q.filter(Transaction.date <= to_date)
    if category:
        q = q.filter(Transaction.category == category)
    if direction:
        q = q.filter(Transaction.direction == direction)

    total = q.count()
    rows = q.offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "id": f"t{row.id}",
                "date": row.date,
                "merchant": row.merchant,
                "amount": row.amount,
                "category": row.category,
                "direction": row.direction,
                "paymentMode": row.payment_mode,
                "sourceType": row.source_type,
                "notes": row.notes,
            }
            for row in rows
        ],
    }
from pydantic import BaseModel
from datetime import datetime

class TransactionCreate(BaseModel):
    amount: float
    merchant: str
    category: str
    date: str
    notes: Optional[str] = None
    direction: str = "debit"
    payment_mode: str = "Cash"
    source_type: str = "Manual"

@router.post("/transactions")
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = Transaction(
        user_id=current_user.id,
        amount=body.amount,
        merchant=body.merchant,
        category=body.category,
        date=body.date,
        notes=body.notes,
        direction=body.direction,
        payment_mode=body.payment_mode,
        source_type=body.source_type,
        confidence=1.0,
        review_status="reviewed",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {
        "status": "success",
        "data": {
            "id": f"t{tx.id}",
            "amount": tx.amount,
            "merchant": tx.merchant,
        }
    }


@router.get("/transactions/summary")
def get_transactions_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    from_date: Optional[str] = Query(None, description="Period start YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="Period end YYYY-MM-DD"),
):
    """Period-based aggregate: total spend/credit + category breakdown."""
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if from_date:
        q = q.filter(Transaction.date >= from_date)
    if to_date:
        q = q.filter(Transaction.date <= to_date)

    all_txns = q.all()
    total_debit = sum(t.amount for t in all_txns if t.direction == "debit")
    total_credit = sum(t.amount for t in all_txns if t.direction == "credit")

    # Category breakdown (debits only)
    cat_q = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(Transaction.user_id == current_user.id, Transaction.direction == "debit")
    )
    if from_date:
        cat_q = cat_q.filter(Transaction.date >= from_date)
    if to_date:
        cat_q = cat_q.filter(Transaction.date <= to_date)

    categories = cat_q.group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()

    return {
        "period": {"from": from_date, "to": to_date},
        "total_spend": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "transaction_count": len(all_txns),
        "category_breakdown": [
            {"category": row.category, "total": round(row.total, 2)}
            for row in categories
        ],
    }


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------
@router.get("/goals")
def get_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()

    emoji_map = {"Emergency Fund": "🛡️", "Goa Trip": "🏖️", "New Laptop": "💻"}
    color_map = {"Emergency Fund": "#5C3D2E", "Goa Trip": "#2563EB", "New Laptop": "#7C3AED"}

    return [
        {
            "id": f"g{row.id}",
            "name": row.name,
            "emoji": emoji_map.get(row.name, "🎯"),
            "targetAmount": row.target_amount,
            "currentAmount": row.current_amount,
            "deadline": row.deadline,
            "color": color_map.get(row.name, "#10B981"),
            "status": row.status,
            "autoPayAmount": row.auto_pay_amount,
            "autoPayDate": row.auto_pay_date,
            "autoPayStatus": row.auto_pay_status,
        }
        for row in rows
    ]


from pydantic import BaseModel

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None

@router.post("/goals", status_code=201)
def create_goal(
    body: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new savings goal for the authenticated user."""
    goal = SavingsGoal(
        user_id=current_user.id,
        name=body.name,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        deadline=body.deadline,
        status="active",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"id": goal.id, "name": goal.name, "target_amount": goal.target_amount}

class GoalEdit(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    deadline: Optional[str] = None

@router.put("/goals/{goal_id}")
def edit_goal(
    goal_id: int,
    body: GoalEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi import HTTPException as _HE
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise _HE(status_code=404, detail="Goal not found")
    
    if body.name is not None:
        goal.name = body.name
    if body.target_amount is not None:
        goal.target_amount = body.target_amount
    if body.deadline is not None:
        goal.deadline = body.deadline
    
    db.commit()
    return {"status": "success"}

class AddMoney(BaseModel):
    amount: float

@router.post("/goals/{goal_id}/add_money")
def add_money_to_goal(
    goal_id: int,
    body: AddMoney,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi import HTTPException as _HE
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise _HE(status_code=404, detail="Goal not found")
    
    goal.current_amount += body.amount
    # Also add to Dekho Wallet
    current_user.dekho_wallet_balance = (current_user.dekho_wallet_balance or 0.0) + body.amount
    
    db.commit()
    return {"status": "success", "new_amount": goal.current_amount, "dekho_wallet_balance": current_user.dekho_wallet_balance}

class AutoPaySetup(BaseModel):
    auto_pay_amount: float
    auto_pay_date: int
    auto_pay_status: str

@router.put("/goals/{goal_id}/auto_pay")
def setup_auto_pay(
    goal_id: int,
    body: AutoPaySetup,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi import HTTPException as _HE
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise _HE(status_code=404, detail="Goal not found")
    
    goal.auto_pay_amount = body.auto_pay_amount
    goal.auto_pay_date = body.auto_pay_date
    goal.auto_pay_status = body.auto_pay_status
    
    db.commit()
    return {"status": "success"}



# ---------------------------------------------------------------------------
# Profile — income now derived from income_range
# ---------------------------------------------------------------------------
INCOME_RANGE_MAP = {
    "0-3L": 20000,
    "3-5L": 35000,
    "5-10L": 65000,
    "10-15L": 105000,
    "15-25L": 165000,
    "25L+": 250000,
}

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user  # JWT-scoped — always the right user

    # Derive monthly income from income_range band; fall back to monthly_budget
    monthly_income = INCOME_RANGE_MAP.get(user.income_range, user.monthly_budget or 0)

    return {
        "name": user.name.split()[0],
        "fullName": user.name,
        "incomeRange": user.income_range,
        "monthlyIncome": monthly_income,
        "stage": user.financial_stage,
        "purposes": user.goal_type.split(",") if user.goal_type else [],
        "monthlyBudget": user.monthly_budget,
        "dekhoWalletBalance": user.dekho_wallet_balance or 0.0,
    }


class BudgetUpdate(BaseModel):
    monthly_budget: float

@router.post("/profile/budget")
def update_budget(
    body: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the authenticated user's monthly budget."""
    current_user.monthly_budget = body.monthly_budget
    db.commit()
    return {"monthly_budget": current_user.monthly_budget}


# ---------------------------------------------------------------------------
# Budgets (New Module)
# ---------------------------------------------------------------------------
from app.models.financial import Budget

DEFAULT_BUDGET_SEED = [
    ("Essentials", "Housing & Household|🏠"),
    ("Essentials", "Utilities|⚡"),
    ("Essentials", "Bills|🧾"),
    ("Essentials", "Food & Dining|🍴"),
    ("Essentials", "Groceries|🛒"),
    ("Essentials", "Transport|🚗"),
    ("Essentials", "Health|💊"),
    ("Essentials", "Personal Care|🧴"),
    ("Essentials", "Insurance|🛡️"),
    ("Essentials", "Loan EMI|💳"),
    ("Essentials", "Credit Card|💳"),
    ("Lifestyle", "Shopping|🛍️"),
    ("Lifestyle", "Entertainment|🎬"),
    ("Lifestyle", "Travel|✈️"),
    ("Lifestyle", "Subscriptions|📺"),
    ("Lifestyle", "Telecom|📱"),
    ("Future-oriented", "Investment|💰"),
    ("Buffer", "Others|🔮"),
    ("Buffer", "Services|🛠️"),
    ("Buffer", "Uncategorised|❓")
]

SECTION_SUBTITLES = {
    "Essentials": "NON-NEGOTIABLE",
    "Lifestyle": "FLEXIBLE",
    "Future-oriented": "GOALS",
    "Buffer": "FLEXIBILITY"
}

@router.get("/budgets")
def get_budgets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime
    import calendar
    
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Fetch budgets for the month
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == current_month).all()
    
    # 2. Seed defaults if empty
    if not budgets:
        for section, category in DEFAULT_BUDGET_SEED:
            b = Budget(user_id=current_user.id, section=section, category=category, monthly_limit=0.0, month=current_month)
            db.add(b)
        db.commit()
        budgets = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == current_month).all()

    # 3. Calculate Spend (Debits in current month)
    # Using python to filter if SQLite date queries are tricky, but date.startswith works for ISO strings.
    spend_query = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(Transaction.user_id == current_user.id, Transaction.direction == "debit")
        .filter(Transaction.date.like(f"{current_month}%"))
        .group_by(Transaction.category)
        .all()
    )
    spend_map = {row.category: row.total for row in spend_query}
    
    # 4. Map to sections
    sections_map = {
        "Essentials": {"label": "Essentials", "subtitle": SECTION_SUBTITLES["Essentials"], "spent": 0, "budget": 0, "subcategories": []},
        "Lifestyle": {"label": "Lifestyle", "subtitle": SECTION_SUBTITLES["Lifestyle"], "spent": 0, "budget": 0, "subcategories": []},
        "Future-oriented": {"label": "Future-oriented", "subtitle": SECTION_SUBTITLES["Future-oriented"], "spent": 0, "budget": 0, "subcategories": []},
        "Buffer": {"label": "Buffer", "subtitle": SECTION_SUBTITLES["Buffer"], "spent": 0, "budget": 0, "subcategories": []}
    }
    
    mapped_categories = set()

    for b in budgets:
        # category is "Label|Emoji"
        parts = b.category.split("|")
        label = parts[0]
        emoji = parts[1] if len(parts) > 1 else "📊"
        
        # Fuzzy match / exact match logic simplified (assuming exact for MVP, or match label)
        # Check if we have spend for this label
        spent_amt = 0
        for tx_cat, total_amt in list(spend_map.items()):
            if tx_cat == label or (label == "Housing & Household" and tx_cat in ["Housing", "Household"]):
                spent_amt += total_amt
                mapped_categories.add(tx_cat)
                
        sub = {
            "label": label,
            "emoji": emoji,
            "amount": spent_amt,
            "budget": b.monthly_limit,
            "match": [label]
        }
        
        if b.section in sections_map:
            sections_map[b.section]["subcategories"].append(sub)
            sections_map[b.section]["budget"] += b.monthly_limit
            sections_map[b.section]["spent"] += spent_amt

    # 5. Handle Uncategorised / Remaining Spend (dump to Buffer)
    for tx_cat, total_amt in spend_map.items():
        if tx_cat not in mapped_categories:
            sections_map["Buffer"]["subcategories"].append({
                "label": tx_cat,
                "emoji": "❓",
                "amount": total_amt,
                "budget": 0.0,
                "match": [tx_cat]
            })
            sections_map["Buffer"]["spent"] += total_amt
            
    # Format Response: strict order
    response = [
        sections_map["Essentials"],
        sections_map["Lifestyle"],
        sections_map["Future-oriented"],
        sections_map["Buffer"]
    ]
    return response


class CategoryBudgetUpdate(BaseModel):
    section: str
    label: str
    emoji: str
    budget: float

@router.post("/budgets/category")
def upsert_category_budget(
    body: CategoryBudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    current_month = datetime.now().strftime("%Y-%m")
    full_category = f"{body.label}|{body.emoji}"
    
    budget_row = db.query(Budget).filter(
        Budget.user_id == current_user.id, 
        Budget.month == current_month,
        Budget.category == full_category
    ).first()
    
    if budget_row:
        budget_row.monthly_limit = body.budget
    else:
        budget_row = Budget(
            user_id=current_user.id,
            section=body.section,
            category=full_category,
            monthly_limit=body.budget,
            month=current_month
        )
        db.add(budget_row)
        
    db.commit()
    return {"status": "success", "monthly_limit": budget_row.monthly_limit}


from typing import List
from pydantic import BaseModel

class BulkCategoryBudgetUpdate(BaseModel):
    section: str
    updates: List[dict] # {label, emoji, budget}

@router.post("/budgets/bulk_update")
def bulk_update_budgets(
    body: BulkCategoryBudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    current_month = datetime.now().strftime("%Y-%m")
    
    for update in body.updates:
        full_category = f"{update['label']}|{update['emoji']}"
        budget_row = db.query(Budget).filter(
            Budget.user_id == current_user.id, 
            Budget.month == current_month,
            Budget.category == full_category
        ).first()
        
        if budget_row:
            budget_row.monthly_limit = update['budget']
        else:
            budget_row = Budget(
                user_id=current_user.id,
                section=body.section,
                category=full_category,
                monthly_limit=update['budget'],
                month=current_month
            )
            db.add(budget_row)
            
    db.commit()
    return {"status": "success"}

@router.get("/budgets/insights")
def get_budget_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime
    import calendar
    from app.core.logging_config import logger

    try:
        now = datetime.now()
        current_month = now.strftime("%Y-%m")
        
        # Calculate previous month
        if now.month == 1:
            prev_month = f"{now.year - 1}-12"
        else:
            prev_month = f"{now.year}-{now.month - 1:02d}"
            
        days_in_month = calendar.monthrange(now.year, now.month)[1]
        days_passed = now.day
        days_remaining = days_in_month - days_passed
        
        # 1. Fetch current month budgets
        budgets = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == current_month).all()
        total_budget = sum(float(b.monthly_limit or 0) for b in budgets)
        
        # 2. Fetch current month spend
        curr_spend_query = (
            db.query(Transaction.category, Transaction.date, Transaction.amount)
            .filter(Transaction.user_id == current_user.id, Transaction.direction == "debit")
            .filter(Transaction.date.like(f"{current_month}%"))
            .all()
        )
        
        total_spend = sum(float(getattr(t, 'amount', t[2] if len(t) > 2 else 0) or 0) for t in curr_spend_query)
        
        # Pace tracking logic
        daily_spend = {day: 0.0 for day in range(1, days_in_month + 1)}
        for t in curr_spend_query:
            try:
                date_str = str(getattr(t, 'date', t[1] if len(t) > 1 else ''))
                amt = float(getattr(t, 'amount', t[2] if len(t) > 2 else 0) or 0)
                day = int(date_str.split("-")[2][:2])
                if day in daily_spend:
                    daily_spend[day] += amt
            except Exception:
                pass
                
        pace_data = []
        cumulative_spend = 0.0
        ideal_daily = float(total_budget) / days_in_month if total_budget > 0 else 0.0
        
        for day in range(1, days_in_month + 1):
            if day <= days_passed:
                cumulative_spend += daily_spend[day]
                pace_data.append({
                    "day": day,
                    "ideal": round(ideal_daily * day, 2),
                    "actual": round(cumulative_spend, 2)
                })
            else:
                pace_data.append({
                    "day": day,
                    "ideal": round(ideal_daily * day, 2),
                    "actual": None
                })
                
        # Category mapping helper
        def map_to_sections(spend_rows, budget_rows):
            res = {
                "Essentials": {"allocated": 0.0, "used": 0.0},
                "Lifestyle": {"allocated": 0.0, "used": 0.0},
                "Future-oriented": {"allocated": 0.0, "used": 0.0},
                "Buffer": {"allocated": 0.0, "used": 0.0},
            }
            
            # map budgets
            b_map = {}
            for b in budget_rows:
                cat_str = str(b.category or '')
                label = cat_str.split("|")[0]
                b_map[label] = b.section
                if b.section in res:
                    res[b.section]["allocated"] += float(b.monthly_limit or 0)
                
            # map spend
            for row in spend_rows:
                cat = str(getattr(row, 'category', row[0] if len(row) > 0 else ''))
                
                # Convert raw decimal/float to python float safely
                if hasattr(row, 'amount') and row.amount is not None:
                    amt = float(row.amount)
                elif len(row) > 2 and row[2] is not None:
                    amt = float(row[2])
                elif len(row) > 1 and row[1] is not None:
                    amt = float(row[1])
                else:
                    amt = 0.0
                    
                matched = False
                for b_label, b_section in b_map.items():
                    if cat == b_label or (b_label == "Housing & Household" and cat in ["Housing", "Household"]):
                        if b_section in res:
                            res[b_section]["used"] += amt
                        matched = True
                        break
                
                if not matched:
                    res["Buffer"]["used"] += amt
                    
            return res

        curr_sections = map_to_sections(curr_spend_query, budgets)
        
        # 3. Fetch prev month spend & budgets for trends
        prev_budgets = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == prev_month).all()
        prev_spend_query = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(Transaction.user_id == current_user.id, Transaction.direction == "debit")
            .filter(Transaction.date.like(f"{prev_month}%"))
            .group_by(Transaction.category)
            .all()
        )
        
        prev_sections = map_to_sections(prev_spend_query, prev_budgets)
        
        trends = []
        for section in curr_sections.keys():
            curr_used = float(curr_sections[section]["used"])
            prev_used = float(prev_sections[section]["used"])
            
            diff_pct = 0.0
            if prev_used > 0:
                diff_pct = ((curr_used - prev_used) / prev_used) * 100
            elif curr_used > 0:
                diff_pct = 100.0
                
            trends.append({
                "section": section,
                "current": round(curr_used, 2),
                "previous": round(prev_used, 2),
                "diff_pct": round(diff_pct)
            })

        rem = float(total_budget - total_spend)
        safe = float(rem / days_remaining) if days_remaining > 0 else 0.0
        util = float((total_spend / total_budget) * 100) if total_budget > 0 else 0.0

        return {
            "health": {
                "total_budget": round(total_budget, 2),
                "total_spend": round(total_spend, 2),
                "remaining": round(rem, 2),
                "days_remaining": days_remaining,
                "safe_daily": round(safe, 2),
                "utilization": round(util, 2)
            },
            "buckets": [
                {"name": k, "allocated": round(v["allocated"], 2), "used": round(v["used"], 2)}
                for k, v in curr_sections.items()
            ],
            "pace": pace_data,
            "trends": trends,
            "raw_budgets": [{"category": str(b.category or ''), "monthly_limit": float(b.monthly_limit or 0)} for b in budgets],
            "raw_spend": [
                {
                    "category": str(getattr(t, 'category', t[0] if len(t) > 0 else '')),
                    "amount": float(getattr(t, 'amount', t[2] if len(t) > 2 else t[1] if len(t) > 1 else 0) or 0)
                }
                for t in curr_spend_query
            ]
        }
    except Exception as exc:
        logger.error(f"Error in get_budget_insights: {exc}", exc_info=True)
        return {
            "health": {
                "total_budget": 0.0,
                "total_spend": 0.0,
                "remaining": 0.0,
                "days_remaining": 30,
                "safe_daily": 0.0,
                "utilization": 0.0
            },
            "buckets": [
                {"name": "Essentials", "allocated": 0.0, "used": 0.0},
                {"name": "Lifestyle", "allocated": 0.0, "used": 0.0},
                {"name": "Future-oriented", "allocated": 0.0, "used": 0.0},
                {"name": "Buffer", "allocated": 0.0, "used": 0.0}
            ],
            "pace": [],
            "trends": [],
            "raw_budgets": [],
            "raw_spend": []
        }

# ---------------------------------------------------------------------------
# Summary (all-time category totals)
# ---------------------------------------------------------------------------
@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """All-time category spend totals for the authenticated user."""
    rows = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(Transaction.user_id == current_user.id, Transaction.direction == "debit")
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [{"category": row.category, "total": round(row.total, 2)} for row in rows]


@router.get("/assets")
def get_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    return [
        {
            "id": f"a{row.id}",
            "name": row.name,
            "type": row.type,
            "balance": row.value,
            "change": 0.0,
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Opportunities / Recommendations
# ---------------------------------------------------------------------------
@router.get("/opportunities")
def get_opportunities(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(Recommendation).filter(Recommendation.user_id == current_user.id).all()

    emoji_map = {
        "Safety first": "🛡️",
        "Wealth building": "📈",
        "Quick saving": "💳",
        "You're on track": "🏠",
    }
    color_map = {
        "Safety first": "positive",
        "Wealth building": "filter",
        "Quick saving": "warning",
        "You're on track": "positive",
    }

    return [
        {
            "id": f"op{row.id}",
            "emoji": emoji_map.get(row.tag, "💡"),
            "title": row.title,
            "description": row.description,
            "why": row.why or "",
            "cta": row.cta,
            "tag": row.tag,
            "tagColor": color_map.get(row.tag, "filter"),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Review Queue — transactions pending user review
# ---------------------------------------------------------------------------
@router.get("/review/queue")
def get_review_queue(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return transactions where review_status is 'pending'."""
    rows = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.review_status == "needs_review")
        .order_by(Transaction.date.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": row.id,
            "date": row.date,
            "merchant": row.merchant,
            "amount": row.amount,
            "direction": row.direction,
            "category": row.category,
            "confidence": row.confidence,
            "review_status": row.review_status,
            "raw_sms": row.raw_sms,
        }
        for row in rows
    ]



# ---------------------------------------------------------------------------
# Delete transaction (JWT-scoped)
# ---------------------------------------------------------------------------
@router.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException as _HE
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise _HE(status_code=404, detail="Transaction not found")
    db.delete(tx); db.commit()
    return None


# ---------------------------------------------------------------------------
# Delete goal (JWT-scoped)
# ---------------------------------------------------------------------------
@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException as _HE
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise _HE(status_code=404, detail="Goal not found")
    db.delete(goal); db.commit()
    return None
