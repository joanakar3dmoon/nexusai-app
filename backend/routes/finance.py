# ============================================================
# API Routes — SuperAgente Financiero
# Análisis de mercado + Inversiones + Retiros
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import json, urllib.request, random

from database import get_db
from models import User, Transaction, Investment, Withdrawal, App

router = APIRouter(prefix="/api/finance", tags=["finance"])


class ProposeInvestmentRequest(BaseModel):
    user_id: str
    name: str
    asset_type: str
    ticker: str = ""
    amount: float
    confidence: float = 0.0
    strategy: str = ""
    analysis_log: str = ""


class ApproveInvestmentRequest(BaseModel):
    investment_id: str
    amount_pct: float  # 0-1 qué % del análisis usar


class WithdrawalRequest(BaseModel):
    user_id: str
    amount: float
    paypal_email: str


# ==================== DASHBOARD FINANCIERO ====================


@router.get("/dashboard/{user_id}")
def financial_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "admin":
        raise HTTPException(403, "Solo admin")

    # Stats
    total_users = db.query(User).count()
    total_apps = db.query(App).count()
    total_earned = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.amount > 0)
        .scalar()
        or 0
    )
    total_invested = (
        db.query(func.sum(Investment.amount_invested))
        .filter(Investment.status == "active")
        .scalar()
        or 0
    )
    current_portfolio = (
        db.query(func.sum(Investment.current_value))
        .filter(Investment.status == "active")
        .scalar()
        or 0
    )

    # Ingresos últimos 30 días
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.amount > 0,
            Transaction.created_at >= month_ago,
        )
        .scalar()
        or 0
    )

    # Transacciones recientes
    recent_txs = (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .limit(20)
        .all()
    )

    # Retiros pendientes
    pending_withdrawals = (
        db.query(func.sum(Withdrawal.amount))
        .filter(Withdrawal.status == "pending")
        .scalar()
        or 0
    )

    return {
        "total_users": total_users,
        "total_apps": total_apps,
        "total_earned": round(total_earned, 2),
        "total_invested": round(total_invested, 2),
        "current_portfolio": round(current_portfolio, 2),
        "roi_total": round(((current_portfolio - total_invested) / max(total_invested, 1)) * 100, 2),
        "recent_income_30d": round(recent_income, 2),
        "pending_withdrawals": round(pending_withdrawals, 2),
        "saldo_disponible": round(user.balance, 2),
        "recent_transactions": [
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in recent_txs
        ],
    }


# ==================== ANÁLISIS DE MERCADO ====================


@router.post("/analyze-market/{user_id}")
def analyze_market(user_id: str, db: Session = Depends(get_db)):
    """SuperAgente analiza el mercado y propone oportunidades"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "admin":
        raise HTTPException(403)

    saldo = user.balance
    if saldo < 10:
        return {
            "opportunities": [],
            "message": "Saldo insuficiente para invertir. Acumula al menos €10 en ingresos.",
        }

    # Análisis simulado de mercado real
    # En producción: conectar APIs reales (Alpha Vantage, Yahoo Finance, CoinGecko)
    opportunities = [
        {
            "name": "S&P 500 ETF (VOO)",
            "asset_type": "etf",
            "ticker": "VOO",
            "confidence": 0.87,
            "strategy": "Compra mensual DCA — promedio de costo en dólares. Riesgo bajo-medio, retorno histórico ~10% anual.",
            "reason": "El S&P 500 mantiene tendencia alcista de largo plazo. La diversificación del ETF reduce riesgo.",
            "min_amount": 50,
        },
        {
            "name": "Bitcoin (BTC)",
            "asset_type": "crypto",
            "ticker": "BTC",
            "confidence": 0.62,
            "strategy": "Entrada gradual 20% del capital. Volátil pero con alta revalorización potencial.",
            "reason": "Halving reciente + adopción institucional creciente. Riesgo alto, retorno potencial alto.",
            "min_amount": 20,
        },
        {
            "name": "Bonos del Tesoro USA (TLT)",
            "asset_type": "bond",
            "ticker": "TLT",
            "confidence": 0.78,
            "strategy": "Compra única o escalonada. Refugio seguro con rendimiento ~4.5% anual.",
            "reason": "Entorno de tipos de interés altos estabilizándose. Buen momento de entrada.",
            "min_amount": 30,
        },
        {
            "name": "Real Estate (REIT - VNQ)",
            "asset_type": "reit",
            "ticker": "VNQ",
            "confidence": 0.71,
            "strategy": "Compra mensual. Dividendos ~4% + apreciación del activo subyacente.",
            "reason": "El sector inmobiliario se recupera con la bajada de tipos. Diversificación sólida.",
            "min_amount": 40,
        },
        {
            "name": "NVIDIA Corp (NVDA)",
            "asset_type": "stock",
            "ticker": "NVDA",
            "confidence": 0.74,
            "strategy": "Compra hold 12+ meses. IA sigue siendo el motor de crecimiento dominante.",
            "reason": "Líder indiscutible en chips de IA. Crecimiento de ingresos >100% interanual.",
            "min_amount": 100,
        },
        {
            "name": "Oro (GLD ETF)",
            "asset_type": "etf",
            "ticker": "GLD",
            "confidence": 0.69,
            "strategy": "10-15% del portfolio como cobertura. Activo refugio clásico.",
            "reason": "Incertidumbre geopolítica + inflación persistente mantienen al oro como reserva de valor.",
            "min_amount": 30,
        },
    ]

    # Filtrar por saldo disponible
    viable = [o for o in opportunities if o["min_amount"] <= saldo * 0.3]

    # Log del análisis
    analysis = Investment(
        user_id=user_id,
        name="Análisis de mercado automático",
        asset_type="analysis",
        amount_invested=0,
        current_value=0,
        status="active",
        analysis_log=json.dumps(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "saldo_disponible": saldo,
                "oportunidades_encontradas": len(viable),
                "oportunidades": [
                    {"name": o["name"], "confidence": o["confidence"]} for o in viable
                ],
            }
        ),
    )
    db.add(analysis)
    db.commit()

    return {
        "opportunities": viable,
        "saldo_disponible": saldo,
        "message": f"Análisis completado. {len(viable)} oportunidades viables encontradas.",
    }


# ==================== INVERSIONES ====================


@router.post("/propose")
def propose_investment(req: ProposeInvestmentRequest, db: Session = Depends(get_db)):
    """El admin propone una inversión manual"""
    inv = Investment(
        user_id=req.user_id,
        name=req.name,
        asset_type=req.asset_type,
        ticker=req.ticker,
        amount_invested=req.amount,
        current_value=req.amount,  # valor inicial = invertido
        status="pending",  # pendiente de aprobación real
        confidence=req.confidence,
        strategy=req.strategy,
        analysis_log=req.analysis_log,
    )
    db.add(inv)

    # Descontar del balance
    user = db.query(User).filter(User.id == req.user_id).first()
    if user:
        user.balance -= req.amount

    tx = Transaction(
        user_id=req.user_id,
        type="investment",
        amount=-req.amount,
        description=f"Inversión: {req.name} ({req.ticker})",
        metadata_json={"investment_id": inv.id},
    )
    db.add(tx)
    db.commit()
    return {"id": inv.id, "status": "pending"}


@router.get("/investments/{user_id}")
def list_investments(user_id: str, status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Investment).filter(Investment.user_id == user_id)
    if status:
        q = q.filter(Investment.status == status)
    investments = q.order_by(Investment.bought_at.desc()).all()

    return [
        {
            "id": i.id,
            "name": i.name,
            "asset_type": i.asset_type,
            "ticker": i.ticker,
            "amount_invested": i.amount_invested,
            "current_value": i.current_value,
            "roi_percent": round(
                ((i.current_value - i.amount_invested) / max(i.amount_invested, 1)) * 100, 2
            ),
            "status": i.status,
            "confidence": i.confidence,
            "strategy": i.strategy,
            "bought_at": i.bought_at.isoformat(),
        }
        for i in investments
    ]


@router.post("/simulate-roi")
def simulate_roi(db: Session = Depends(get_db)):
    """Simula la evolución de inversiones activas (cada hora idealmente)"""
    investments = db.query(Investment).filter(Investment.status == "active").all()
    for inv in investments:
        cambio = random.uniform(-0.03, 0.05)  # -3% a +5%
        inv.current_value = round(inv.current_value * (1 + cambio), 2)

    db.commit()
    return {"updated": len(investments)}


# ==================== RETIROS ====================


@router.post("/request-withdrawal")
def request_withdrawal(req: WithdrawalRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(404)
    if user.balance < req.amount:
        raise HTTPException(400, "Saldo insuficiente")

    w = Withdrawal(
        user_id=req.user_id,
        amount=req.amount,
        paypal_email=req.paypal_email,
        status="pending",
    )
    db.add(w)

    # Congelar saldo (no disponible hasta procesar)
    tx = Transaction(
        user_id=req.user_id,
        type="withdrawal",
        amount=-req.amount,
        description=f"Solicitud de retiro a PayPal ({req.paypal_email})",
        metadata_json={"withdrawal_id": w.id},
        status="pending",
    )
    db.add(tx)
    db.commit()
    return {"id": w.id, "status": "pending"}


@router.post("/process-withdrawal/{withdrawal_id}")
def process_withdrawal(withdrawal_id: str, action: str = "approve", db: Session = Depends(get_db)):
    """Admin aprueba o rechaza un retiro"""
    w = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not w:
        raise HTTPException(404)

    if action == "approve":
        w.status = "completed"
        w.processed_at = datetime.now(timezone.utc)
        # Actualizar transacción
        tx = (
            db.query(Transaction)
            .filter(Transaction.metadata_json["withdrawal_id"].as_string() == withdrawal_id)
            .first()
        )
        if tx:
            tx.status = "completed"
            tx.description = f"Retiro completado a PayPal ({w.paypal_email}) — €{w.amount}"
    elif action == "reject":
        w.status = "rejected"
        # Devolver saldo al usuario
        user = db.query(User).filter(User.id == w.user_id).first()
        if user:
            user.balance += w.amount
        # Marcar transacción
        tx = (
            db.query(Transaction)
            .filter(Transaction.metadata_json["withdrawal_id"].as_string() == withdrawal_id)
            .first()
        )
        if tx:
            tx.status = "failed"

    db.commit()
    return {"status": w.status}


@router.get("/withdrawals/{user_id}")
def list_withdrawals(user_id: str, status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Withdrawal).filter(Withdrawal.user_id == user_id)
    if status:
        q = q.filter(Withdrawal.status == status)
    withdrawals = q.order_by(Withdrawal.created_at.desc()).all()
    return [
        {
            "id": w.id,
            "amount": w.amount,
            "paypal_email": w.paypal_email,
            "status": w.status,
            "created_at": w.created_at.isoformat(),
            "processed_at": w.processed_at.isoformat() if w.processed_at else None,
        }
        for w in withdrawals
    ]


# ==================== INGRESOS ====================


@router.post("/record-revenue")
def record_revenue(app_id: str, amount: float, source: str = "ad_revenue", db: Session = Depends(get_db)):
    """Registra ingreso real desde AdMob/Amazon (llamado por webhook)"""
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise HTTPException(404)

    app.revenue = (app.revenue or 0) + amount
    app.views += 1

    user = db.query(User).filter(User.id == app.user_id).first()
    if user:
        user.balance = (user.balance or 0) + amount * 0.7  # 70% para el admin, 30% reinversión
        user.total_earned = (user.total_earned or 0) + amount

    tx = Transaction(
        user_id=app.user_id,
        type=source,
        amount=amount,
        description=f"Ingreso por {source} — {app.name}",
        metadata_json={"app_id": app_id, "source": source},
    )
    db.add(tx)
    db.commit()
    return {"ok": True, "balance": user.balance if user else 0}


@router.get("/revenue-report/{user_id}")
def revenue_report(user_id: str, days: int = 30, db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.amount > 0,
            Transaction.created_at >= since,
        )
        .all()
    )

    total = sum(t.amount for t in txs)
    by_date = {}
    for t in txs:
        date_str = t.created_at.strftime("%Y-%m-%d")
        if date_str not in by_date:
            by_date[date_str] = {"revenue": 0, "commissions": 0}
        if t.type == "ad_revenue":
            by_date[date_str]["revenue"] += t.amount
        else:
            by_date[date_str]["commissions"] += t.amount

    return {"total": round(total, 2), "by_date": by_date, "days": days}