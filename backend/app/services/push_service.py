import json
import logging
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException
from app.core.config import settings
from app.models import PushSubscription

logger = logging.getLogger("dekho.push")


def send_push_to_user(db: Session, user_id: int, title: str, body: str, url: str = "/home") -> int:
    """
    Sends a Web Push notification to every device the user has subscribed on.
    Prunes subscriptions the push service reports as gone (404/410).
    Returns the number of subscriptions successfully notified.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("Push not configured (missing VAPID keys) — skipping send.")
        return 0

    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = 0

    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"},
            )
            sent += 1
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                # Subscription is no longer valid on the browser's end — remove it.
                db.delete(sub)
                db.commit()
            else:
                logger.warning(f"Push to user {user_id} failed: {e}")

    return sent
