from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class SupportFeedback(Base):
    __tablename__ = "support_feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(32), nullable=False)  # bug | feature | general | support
    message = Column(Text, nullable=False)
    contact_email = Column(String, nullable=True)
    status = Column(String(32), default="open")  # open | reviewed
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="support_feedback_entries")
