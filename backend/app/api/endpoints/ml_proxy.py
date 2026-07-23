"""
ml_proxy.py
-----------
Transparent proxy from the main Dekho backend → financeAI ML sidecar.

Why proxy instead of calling ML service directly from the frontend?
  1. Security — ML service is an internal service, never exposed to internet.
  2. Auth    — all requests are JWT-authenticated here; ML sidecar is auth-free.
  3. Flexibility — we can swap the ML service without changing any frontend code.

Available routes (all require JWT):
    GET  /api/v1/ml/health
    GET  /api/v1/ml/insights/monthly-summary
    GET  /api/v1/ml/insights/recurring
    GET  /api/v1/ml/insights/top-merchants
    POST /api/v1/ml/classify          — single SMS / transaction classification
    POST /api/v1/ml/feedback/correct  — user correction → ML learning loop
    GET  /api/v1/ml/review/queue      — pending review transactions
"""

import os
import logging
from typing import Any, Dict, Optional
from datetime import date

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models import User
from sqlalchemy.orm import Session

logger = logging.getLogger("dekho.ml_proxy")
router = APIRouter()

ML_BASE = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8001").replace("localhost", "127.0.0.1")
ML_TIMEOUT = 5.0   # seconds — fail fast so the main app stays responsive


# ---------------------------------------------------------------------------
# Internal helper — forward request to ML service
# ---------------------------------------------------------------------------
async def _ml_get(path: str, params: Optional[Dict] = None) -> Any:
    """Forward a GET to the ML sidecar; raise 503 on failure."""
    try:
        async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
            r = await client.get(f"{ML_BASE}{path}", params=params)
            r.raise_for_status()
            return r.json()
    except httpx.TimeoutException:
        logger.warning(f"ML service timeout: GET {path}")
        raise HTTPException(503, "ML service is temporarily unavailable. Please try again later.")
    except httpx.RequestError as e:
        logger.error(f"ML service unreachable: {e}")
        raise HTTPException(503, "ML service is temporarily unavailable. Please try again later.")
    except httpx.HTTPStatusError as e:
        logger.error(f"ML service error {e.response.status_code}: {path}")
        raise HTTPException(e.response.status_code, e.response.text)


async def _ml_post(path: str, payload: Dict) -> Any:
    """Forward a POST to the ML sidecar."""
    try:
        async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
            r = await client.post(f"{ML_BASE}{path}", json=payload)
            r.raise_for_status()
            return r.json()
    except httpx.TimeoutException:
        raise HTTPException(503, "ML service is temporarily unavailable.")
    except httpx.RequestError:
        raise HTTPException(503, "ML service is temporarily unavailable.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, e.response.text)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@router.get("/health")
async def ml_health(_: User = Depends(get_current_user)):
    """Check if the ML sidecar is alive."""
    return await _ml_get("/health")


# ---------------------------------------------------------------------------
# Insights (read-only — scoped to current user)
# ---------------------------------------------------------------------------
@router.get("/insights/monthly-summary")
async def ml_monthly_summary(
    year:  int = Query(default=date.today().year),
    month: int = Query(default=date.today().month),
    current_user: User = Depends(get_current_user),
):
    """Monthly income/expense/savings breakdown from the ML sidecar."""
    return await _ml_get(
        "/api/insights/monthly-summary",
        params={"user_id": current_user.id, "year": year, "month": month},
    )


@router.get("/insights/recurring")
async def ml_recurring(
    current_user: User = Depends(get_current_user),
):
    """Recurring/subscription transactions detected by ML pattern analysis."""
    return await _ml_get(
        "/api/insights/recurring",
        params={"user_id": current_user.id},
    )


@router.get("/insights/top-merchants")
async def ml_top_merchants(
    month: int = Query(default=date.today().month),
    current_user: User = Depends(get_current_user),
):
    """Top spending merchants this month."""
    return await _ml_get(
        "/api/insights/top-merchants",
        params={"user_id": current_user.id, "month": month},
    )


@router.get("/insights/festival-context")
async def ml_festival_context(current_user: User = Depends(get_current_user)):
    """Indian festival calendar spending awareness."""
    return await _ml_get(
        "/api/insights/festival-context",
        params={"user_id": current_user.id},
    )


@router.get("/insights/cashback")
async def ml_cashback(current_user: User = Depends(get_current_user)):
    """Cashback and wallet-float tracking."""
    return await _ml_get(
        "/api/insights/cashback-savings",
        params={"user_id": current_user.id},
    )


# ---------------------------------------------------------------------------
# Classification — real-time SMS → category
# ---------------------------------------------------------------------------
class ClassifyRequest(BaseModel):
    sms_text: str
    merchant: Optional[str] = None
    vpa: Optional[str] = None


@router.post("/classify")
async def ml_classify(
    body: ClassifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Classify a single SMS / transaction description through the ML HybridClassifier.
    Returns: { category, sub_category, confidence, merchant, amount, tx_type }
    """
    from app.models import Transaction
    
    result = await _ml_post(
        "/api/sms/ingest",
        {
            "user_id": current_user.id,
            "sms_text": body.sms_text,
        },
    )
    
    if "error" in result:
        raise HTTPException(422, result.get("error"))
        
    if "amount" in result and result.get("direction"):
        review_status = "needs_review" if result.get("needs_review") else "auto_approved"
        
        tx = Transaction(
            user_id=current_user.id,
            amount=result["amount"],
            merchant=result["merchant"],
            category=result["category"],
            sub_category=result.get("sub_category", "General"),
            date=result["date"],
            direction=result["direction"],
            payment_mode=result.get("payment_mode", "Cash"),
            vpa=result.get("vpa"),
            confidence=result.get("confidence", 1.0),
            raw_sms=result.get("raw_sms", body.sms_text),
            review_status=review_status,
            source_type="sms",
            is_income=(result["direction"] == "credit"),
            is_refund=(result["category"] == "Refund")
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
        result["id"] = f"t{tx.id}"
        
    return result


# ---------------------------------------------------------------------------
# Feedback — category correction → ML learning loop
# ---------------------------------------------------------------------------
class FeedbackRequest(BaseModel):
    transaction_id: int
    category: str
    sub_category: str = "General"
    is_reimbursement: bool = False


@router.post("/feedback/correct")
async def ml_feedback(
    body: FeedbackRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Forward a user category correction to the ML learning service.
    This updates the merchant mapping so future transactions are auto-categorised correctly.
    """
    return await _ml_post(
        "/api/feedback/correct",
        {
            "user_id": current_user.id,
            "transaction_id": body.transaction_id,
            "category": body.category,
            "sub_category": body.sub_category,
            "is_reimbursement": body.is_reimbursement,
        },
    )


# ---------------------------------------------------------------------------
# Review queue — transactions the ML was unsure about
# ---------------------------------------------------------------------------
@router.get("/review/queue")
async def ml_review_queue(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Fetch transactions flagged for user review (low ML confidence)."""
    return await _ml_get(
        "/api/review/queue",
        params={"user_id": current_user.id, "limit": limit},
    )


# ---------------------------------------------------------------------------
# Spending pattern (used by insight engine in Phase B)
# ---------------------------------------------------------------------------
@router.get("/pattern")
async def ml_spending_pattern(current_user: User = Depends(get_current_user)):
    """Get the ML-computed spending pattern for the current user."""
    return await _ml_get(
        f"/api/users/ml/pattern/{current_user.id}",
    )
