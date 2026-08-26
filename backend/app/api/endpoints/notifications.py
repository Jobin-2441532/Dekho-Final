from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models import User, PushSubscription
from app.api.endpoints.auth import get_current_user
from app.services.push_service import send_push_to_user

router = APIRouter()


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Public — the frontend needs this before the user is necessarily logged in to subscribe."""
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeRequest(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


@router.post("/subscribe", status_code=201)
def subscribe(
    body: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == body.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
    else:
        db.add(PushSubscription(
            user_id=current_user.id,
            endpoint=body.endpoint,
            p256dh=body.keys.p256dh,
            auth=body.keys.auth,
        ))
    db.commit()
    return {"status": "subscribed"}


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.post("/unsubscribe")
def unsubscribe(
    body: UnsubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == body.endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"status": "unsubscribed"}


@router.post("/test")
def send_test_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fires an immediate push to the current user's devices — used to demo the feature live."""
    if not db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).first():
        raise HTTPException(status_code=400, detail="No push subscription found for this device. Enable notifications first.")

    sent = send_push_to_user(
        db, current_user.id,
        title="Dekho",
        body=f"Hey {current_user.name.split(' ')[0] if current_user.name else 'there'}! Notifications are working. 🎉",
        url="/home",
    )
    if sent == 0:
        raise HTTPException(status_code=502, detail="Could not deliver notification to any subscribed device.")
    return {"status": "sent", "devices": sent}
