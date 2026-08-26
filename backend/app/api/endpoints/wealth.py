from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.api.endpoints.auth import get_current_user
from app.services.wealth_service import compute_wealth_profile

router = APIRouter()


@router.get("/profile")
def get_wealth_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Real net worth, category breakdown, and monthly signals for the Wealth page."""
    return compute_wealth_profile(db, current_user)
