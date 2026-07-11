# NEXUSAI BACKEND — API Routes — Finance & Profits

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from database import get_db
from models import User, Transaction, Investment, App

router = APIRouter(prefix="/api/finance", tags=["finance"])


class WithdrawRequest(BaseModel):
    user_id: str
    amount: float
    paypal_email: str


class InvestmentRequest(BaseModel):
    user_id: str
    name: str
    asset_type: str
    ticker: str
    amount: float
    confidence: float
    strategy: str
    analysis_log: str


@router.get("/dashboard/{user_id}")
def get_finance_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    # Calcular ingresos de hoy
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_revenue = db.query(__import__("sqlalchemy").func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type.in_(["ad_revenue", "amazon_commission"]),
        Transaction.created_at >= today
    ).scalar() or 0.0

    # Total apps
    apps_count = db.query(App).filter(App.user_id == user_id).count()

    # Inversiones activas
    active_investments = db.query(Investment).filter(
        Investment.user_id == user_id,
        Investment.status == "active"
    ).all()

    return {
        "balance": user.balance,
        "total_earned": user.total_earned,
        "today_revenue": today_revenue,
        "apps_count": apps_count,
        "active_investments_count": len(active_investments),
        "credits": user.credits,
    }


@router.post("/request-withdrawal")
def request_withdrawal(req: WithdrawRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    if user.balance < req.amount:
        raise HTTPException(400, "Saldo insuficiente")

    if req.amount < 10:
        raise HTTPException(400, "Mínimo de retiro: 10 EUR")

    # Restar saldo inmediatamente (bloquearlo)
    user.balance -= req.amount

    # Registrar transacción de retiro (pendiente)
    tx = Transaction(
        user_id=user.id,
        type="withdrawal",
        amount=-req.amount,
        status="pending",
        description=f"Retiro PayPal a {req.paypal_email}",
        metadata_json={"paypal_email": req.paypal_email}
    )
    db.add(tx)
    db.commit()

    return {"status": "pending", "message": "Solicitud enviada a revisión"}


@router.get("/withdrawals/{user_id}")
def get_user_withdrawals(user_id: str, db: Session = Depends(get_db)):
    wds = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "withdrawal"
    ).order_by(Transaction.created_at.desc()).all()

    return [
        {
            "id": w.id,
            "amount": abs(w.amount),
            "status": w.status,
            "paypal_email": w.metadata_json.get("paypal_email"),
            "date": w.created_at.isoformat()
        }
        for w in wds
    ]


@router.post("/analyze-market/{user_id}")
def analyze_market(user_id: str):
    # Simulación de análisis del superagente
    import random
    assets = ["BTC", "ETH", "S&P500", "NASDAQ100", "GOLD"]
    asset = random.choice(assets)
    confidence = random.randint(65, 95)
    
    return {
        "asset": asset,
        "confidence": confidence,
        "recommendation": "BUY" if confidence > 75 else "HOLD",
        "strategy": "Crecimiento agresivo" if asset in ["BTC", "ETH"] else "Crecimiento estable",
        "reasoning": f"Análisis técnico indica fuerte soporte en {asset}. El sentimiento del mercado es positivo."
    }


@router.post("/propose")
def propose_investment(req: InvestmentRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(404)

    # El dinero de inversión viene de los beneficios (balance)
    if user.balance < req.amount:
        raise HTTPException(400, "Saldo insuficiente para invertir")

    user.balance -= req.amount

    inv = Investment(
        user_id=req.user_id,
        name=req.name,
        asset_type=req.asset_type,
        ticker=req.ticker,
        amount_invested=req.amount,
        current_value=req.amount,
        confidence=req.confidence,
        strategy=req.strategy,
        analysis_log=req.analysis_log
    )
    db.add(inv)
    
    tx = Transaction(
        user_id=user.id,
        type="investment",
        amount=-req.amount,
        description=f"Inversión en {req.name} ({req.ticker})"
    )
    db.add(tx)
    
    db.commit()
    return {"id": inv.id, "status": "active"}


@router.post("/record-revenue")
def record_revenue(app_id: str, amount: float, source: str, db: Session = Depends(get_db)):
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise HTTPException(404)

    user = db.query(User).filter(User.id == app.user_id).first()
    if not user:
        raise HTTPException(404)

    # Sumar al usuario
    user.balance += amount
    user.total_earned += amount
    
    # Sumar a la app
    app.revenue += amount

    # Registrar transacción
    tx = Transaction(
        user_id=user.id,
        type="ad_revenue" if source == "admob" else "amazon_commission",
        amount=amount,
        description=f"Ingreso de {source} desde '{app.name}'",
        metadata_json={"app_id": app_id, "source": source}
    )
    db.add(tx)
    db.commit()
    return {"ok": True, "new_balance": user.balance}
