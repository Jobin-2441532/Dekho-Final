from typing import Optional, Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, SupportFeedback
from app.api.endpoints.auth import get_current_user

router = APIRouter()


class SupportFeedbackCreate(BaseModel):
    type: Literal["bug", "feature", "general", "support"]
    message: str
    contact_email: Optional[str] = None


@router.post("", status_code=201)
def submit_feedback(
    body: SupportFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = SupportFeedback(
        user_id=current_user.id,
        type=body.type,
        message=body.message,
        contact_email=body.contact_email or current_user.email,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"status": "received", "id": entry.id}
