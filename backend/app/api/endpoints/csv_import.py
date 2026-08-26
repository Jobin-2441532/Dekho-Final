"""
csv_import.py
Endpoint: POST /api/v1/import/statement
Parses a bank statement CSV and loads it into the current user's account.
Called immediately after login when the user selects a statement on the login screen.
"""
import csv
import re
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Transaction
from app.api.endpoints.auth import get_current_user
from app.models import User

router = APIRouter()

# ── Path to bundled statements ────────────────────────────────────────────────
STATEMENTS_DIR = Path(__file__).parent.parent.parent.parent / "data" / "statements"

# ── Available statements metadata (shown on the login screen) ─────────────────
STATEMENT_META = {
    "Statement9": {
        "label":      "Statement 9",
        "salary":     "₹50,000 / month",
        "transactions": 64,
        "profile":    "Mid-income, Bangalore",
        "icon":       "🏙️",
        "color":      "#8B6347",
    },
    "Statement10": {
        "label":      "Statement 10",
        "salary":     "₹52,000 / month",
        "transactions": 64,
        "profile":    "Upper-mid, Hyderabad",
        "icon":       "💼",
        "color":      "#6C8B47",
    },
    "Statement11": {
        "label":      "Statement 11",
        "salary":     "₹47,000 / month",
        "transactions": 64,
        "profile":    "Moderate spend, Chennai",
        "icon":       "🌊",
        "color":      "#47688B",
    },
}


def _compute_date_range(statement_id: str) -> str:
    """Derive the display date range from the CSV's own first/last rows,
    so it can never go stale independently of the data (unlike a hardcoded string)."""
    csv_path = STATEMENTS_DIR / f"{statement_id}.csv"
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            rows = [row for row in csv.DictReader(f) if row.get("date")]
        first_date = datetime.strptime(rows[0]["date"], "%Y-%m-%d")
        last_date = datetime.strptime(rows[-1]["date"], "%Y-%m-%d")
        first_day = str(int(first_date.strftime("%d")))  # portable leading-zero strip
        last_day = str(int(last_date.strftime("%d")))
        if first_date.strftime("%b %Y") == last_date.strftime("%b %Y"):
            return f"{first_day} – {last_day} {last_date.strftime('%b %Y')}"
        return f"{first_day} {first_date.strftime('%b')} – {last_day} {last_date.strftime('%b %Y')}"
    except Exception:
        return "Recent"

# ── Category mapping from CSV → Dekho app categories ─────────────────────────
CATEGORY_MAP: dict[str, tuple[str, str]] = {
    "income":          ("Income",             "Salary"),
    "rent":            ("Housing",            "Rent"),
    "food":            ("Food & Dining",      "General"),
    "grocery":         ("Groceries",          "Supermarket"),
    "groceries":       ("Groceries",          "Supermarket"),
    "transport":       ("Transport",          "General"),
    "shopping":        ("Shopping",           "Online"),
    "entertainment":   ("Entertainment",      "Streaming"),
    "utilities":       ("Utilities",          "Bills"),
    "health":          ("Health",             "Medical"),
    "p2p":             ("Personal Transfer",  "UPI"),
    "review_required": ("Uncategorised",      "Unknown"),
}

# ── Merchant keyword normaliser ───────────────────────────────────────────────
MERCHANT_BRANDS: list[tuple[str, str]] = [
    ("SWIGGY",       "Swiggy"),
    ("ZOMATO",       "Zomato"),
    ("BLINKIT",      "Blinkit"),
    ("BIGBASKET",    "BigBasket"),
    ("AMAZON",       "Amazon"),
    ("MYNTRA",       "Myntra"),
    ("NETFLIX",      "Netflix"),
    ("SPOTIFY",      "Spotify"),
    ("UBER",         "Uber"),
    ("OLA",          "Ola"),
    ("STARBUCKS",    "Starbucks"),
    ("DOMINOS",      "Dominos"),
    ("MEDPLUS",      "MedPlus"),
    ("PVR",          "PVR Cinemas"),
    ("IOCL",         "IOCL Petrol"),
    ("HPCL",         "HPCL Petrol"),
    ("HP PETROL",    "HP Petrol"),
    ("ELECTRICITY",  "Electricity Board"),
    ("RENT",         "Rent Transfer"),
    ("SALARY",       "Salary Credit"),
    ("BONUS",        "Bonus Credit"),
    ("PETROL",       "Petrol Pump"),
    ("PHARMACY",     "Pharmacy"),
    ("INTERNET",     "Internet Provider"),
    ("MOBILE RECHARGE","Mobile Recharge"),
    ("WATER BILL",   "Water Board"),
    ("GROCERY",      "Grocery Store"),
]


def _extract_merchant(description: str, category_raw: str) -> str:
    """Return a clean merchant name from the CSV description field."""
    desc_upper = description.upper()
    for keyword, brand in MERCHANT_BRANDS:
        if keyword in desc_upper:
            return brand
    # Fallback: take first 2 words, title-cased
    words = re.sub(r"[/\\|#]", " ", description).split()
    clean = " ".join(words[:2]).title() if words else description[:20].title()
    return clean or "Unknown"


def _map_payment_mode(csv_mode: str, description: str, transaction_type: str) -> str:
    """Map the CSV 'mode' column directly to our standard payment mode labels."""
    m = csv_mode.strip()
    if m == "UPI":          return "UPI"
    if m == "NetBanking":   return "NEFT"
    if m == "Credit Card":  return "Credit Card"
    if m == "Debit Card":   return "Debit Card"
    if m == "AutoPay":      return "AutoPay"
    if m == "IMPS":         return "IMPS"
    if m == "ATM":          return "ATM"
    # Fallback: infer from description
    desc_upper = description.upper()
    if "UPI" in desc_upper:    return "UPI"
    if "NEFT" in desc_upper:   return "NEFT"
    if "CARD" in desc_upper:   return "Card"
    return "UPI"  # default


class ImportRequest(BaseModel):
    statement: str   # "Statement6" | "Statement7" | "Statement8"


# ── GET /api/v1/import/statements ─────────────────────────────────────────────
@router.get("/statements")
def list_statements():
    """Return metadata for all available bank statements (used by login page)."""
    return [
        {"id": k, "date_range": _compute_date_range(k), **v}
        for k, v in STATEMENT_META.items()
    ]


# ── POST /api/v1/import/statement ─────────────────────────────────────────────
@router.post("/statement")
def import_statement(
    body: ImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parse the selected bank statement CSV and load all transactions for
    the current user. Existing transactions for this user are wiped first
    so re-imports stay idempotent.
    """
    name = body.statement
    if name not in STATEMENT_META:
        raise HTTPException(400, f"Unknown statement '{name}'. Valid: {list(STATEMENT_META.keys())}")

    csv_path = STATEMENTS_DIR / f"{name}.csv"
    if not csv_path.exists():
        raise HTTPException(500, f"Statement file not found on server: {csv_path}")

    # ── 1. Clear existing transactions for this user ──────────────────────────
    deleted = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).delete(synchronize_session="fetch")
    db.commit()

    # ── 2. Parse CSV ──────────────────────────────────────────────────────────
    inserted = 0
    errors   = []

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            # Skip completely blank rows
            if not any(row.values()):
                continue
            try:
                date_str      = row["date"].strip()
                description   = row["description"].strip()
                category_raw  = row["category"].strip()
                amount_str    = row["amount"].strip()
                tx_type       = row["transaction_type"].strip().lower()
                csv_mode      = row.get("mode", "").strip()  # new column in Statement9/10/11

                # Validate / parse
                if not date_str or not amount_str:
                    continue
                try:
                    parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    errors.append(f"Row {i}: bad date '{date_str}'")
                    continue

                amount = float(amount_str)
                direction = "credit" if tx_type == "credit" else "debit"

                # Category mapping
                cat_key = category_raw.lower()
                category, sub_category = CATEGORY_MAP.get(
                    cat_key, ("Uncategorised", "General")
                )

                # Special handling for REVIEW_REQUIRED or Uncategorised
                is_review = cat_key == "review_required" or category == "Uncategorised"
                review_status = "needs_review" if is_review else "auto_approved"
                confidence    = 0.50 if is_review else 0.95

                # Derived flags
                is_income  = direction == "credit" and category == "Income"
                is_refund  = category == "Refund"

                merchant     = _extract_merchant(description, category_raw)
                payment_mode = _map_payment_mode(csv_mode, description, direction)

                tx = Transaction(
                    user_id      = current_user.id,
                    date         = parsed_date,
                    merchant     = merchant,
                    amount       = amount,
                    direction    = direction,
                    category     = category,
                    sub_category = sub_category,
                    payment_mode = payment_mode,
                    vpa          = None,
                    confidence   = confidence,
                    raw_sms      = description,       # store original description
                    review_status= review_status,
                    source_type  = "csv",
                    is_income    = is_income,
                    is_refund    = is_refund,
                )
                db.add(tx)
                inserted += 1

            except Exception as e:
                errors.append(f"Row {i}: {e}")

    db.commit()

    return {
        "status":   "ok",
        "statement": name,
        "deleted":  deleted,
        "inserted": inserted,
        "errors":   errors[:10],   # cap error list
    }
