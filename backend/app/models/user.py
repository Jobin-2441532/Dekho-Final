from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)  # nullable for existing seeded users
    income_range = Column(String)
    goal_type = Column(String)
    risk_comfort = Column(String)
    monthly_budget = Column(Float)
    financial_stage = Column(String)
    risk_tolerance = Column(String, nullable=True)     # self-reported: cautious | balanced | growth
    risk_experience = Column(String, nullable=True)    # self-reported: new | some | experienced
    goal_horizon_years = Column(Integer, nullable=True)  # self-reported time horizon for the risk check
    dekho_wallet_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())

    transactions = relationship("Transaction", back_populates="user")
    savings_goals = relationship("SavingsGoal", back_populates="user")
    income_entries = relationship("IncomeEntry", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    assets = relationship("Asset", back_populates="user")
    uploaded_files = relationship("UploadedFile", back_populates="user")
    recommendations = relationship("Recommendation", back_populates="user")
    merchant_mappings = relationship("MerchantMapping", back_populates="user")
    feedback_logs = relationship("FeedbackLog", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    push_subscriptions = relationship("PushSubscription", back_populates="user")
    support_feedback_entries = relationship("SupportFeedback", back_populates="user")

