from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.api.endpoints.auth import get_current_user
from app.services.grow_service import compute_grow_profile
from app.services.risk_service import compute_risk_profile, save_risk_answers
from app.services.market_service import get_market_context

router = APIRouter()


@router.get("/profile")
def get_grow_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Real investment-readiness state, derived from the user's own data."""
    return compute_grow_profile(db, current_user)


@router.get("/risk-profile")
def get_risk_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Capacity (data-derived) vs. tolerance/experience/horizon (self-reported)."""
    return compute_risk_profile(db, current_user)


class RiskAnswers(BaseModel):
    risk_tolerance: str = Field(pattern="^(cautious|balanced|growth)$")
    risk_experience: str = Field(pattern="^(new|some|experienced)$")
    goal_horizon_years: int = Field(ge=0, le=60)


@router.post("/risk-profile")
def post_risk_profile(
    body: RiskAnswers,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save the user's risk-check answers, then return the computed profile."""
    save_risk_answers(db, current_user, body.risk_tolerance, body.risk_experience, body.goal_horizon_years)
    return compute_risk_profile(db, current_user)


@router.get("/market")
def get_market(current_user: User = Depends(get_current_user)):
    """Current index levels + news headlines, proxied server-side so no API
    key or third-party call is ever exposed to the frontend. Informational
    only — not a trading signal."""
    return get_market_context()
