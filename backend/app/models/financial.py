from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    deadline = Column(String)
    status = Column(String, default='active')
    auto_pay_amount = Column(Float, default=0.0)
    auto_pay_date = Column(Integer, nullable=True)
    auto_pay_status = Column(String, default='inactive')
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="savings_goals")

class IncomeEntry(Base):
    __tablename__ = "income_entries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String, nullable=False)
    source = Column(String)
    amount = Column(Float, nullable=False)
    notes = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="income_entries")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    section = Column(String(64), nullable=False, server_default="Buffer")
    category = Column(String(128), nullable=False)
    monthly_limit = Column(Float, default=0.0)
    month = Column(String(7), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="budgets")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, nullable=False) # e.g. "savings", "investments", "liabilities"
    name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="assets")
