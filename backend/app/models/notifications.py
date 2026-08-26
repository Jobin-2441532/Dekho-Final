from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String, nullable=False, unique=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="push_subscriptions")


class NotificationLog(Base):
    """
    Dedup record so a given notification only fires once.
    `kind` encodes uniqueness — e.g. "budget_12_80" (budget id 12, 80% threshold,
    naturally scoped to that budget's month) or "daily_nudge_2026-08-24".
    """
    __tablename__ = "notification_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(128), nullable=False)
    sent_at = Column(DateTime, server_default=func.now())
