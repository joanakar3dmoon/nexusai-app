# ============================================================
# NEXUSAI BACKEND — Modelos de datos
# ============================================================

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from database import Base


def new_id():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_id)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, default="")
    role = Column(String, default="user")  # "admin" or "user"
    plan = Column(String, default="free")  # "free" | "premium"
    plan_expires_at = Column(DateTime, nullable=True)  # None = sin expiración / vitalicio
    paypal_subscription_id = Column(String, default="")  # ID suscripción PayPal
    credits = Column(Integer, default=10)
    balance = Column(Float, default=0.0)  # saldo acumulado
    total_earned = Column(Float, default=0.0)
    paypal_email = Column(String, default="")
    created_at = Column(DateTime, default=now)
    last_login = Column(DateTime, default=now)

    apps = relationship("App", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")


class App(Base):
    __tablename__ = "apps"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    category = Column(String, default="general")
    prompt = Column(Text, default="")
    source_code = Column(Text, default="")
    status = Column(String, default="draft")  # draft, published, archived
    views = Column(Integer, default=0)
    downloads = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)  # ingresos generados por esta app
    monetization = Column(JSON, default=dict)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="apps")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # ad_revenue, amazon_commission, credit_purchase, withdrawal, investment
    amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    status = Column(String, default="completed")  # pending, completed, failed
    description = Column(String, default="")
    metadata_json = Column(JSON, default=dict, name="metadata")
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="transactions")


class Investment(Base):
    __tablename__ = "investments"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    asset_type = Column(String, nullable=False)  # stock, etf, crypto, reit, bond
    ticker = Column(String, default="")
    amount_invested = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    roi_percent = Column(Float, default=0.0)
    status = Column(String, default="active")  # active, closed
    confidence = Column(Float, default=0.0)  # 0-1 del análisis
    strategy = Column(String, default="")
    bought_at = Column(DateTime, default=now)
    closed_at = Column(DateTime, nullable=True)

    # Log de decisiones del superagente
    analysis_log = Column(Text, default="")


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    paypal_email = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, processing, completed, rejected
    created_at = Column(DateTime, default=now)
    processed_at = Column(DateTime, nullable=True)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(Text, default="")
    description = Column(String, default="")
    updated_at = Column(DateTime, default=now)