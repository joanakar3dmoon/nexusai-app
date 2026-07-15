# ============================================================
# NEXUSAI — Pagos y suscripciones (PayPal)
# ============================================================
import hashlib, hmac, os
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from database import get_db
from models import User, Transaction

router = APIRouter(prefix="/api/payments", tags=["payments"])

PAYPAL_PLAN_ID = os.getenv("PAYPAL_PLAN_ID", "")          # ID del plan mensual en PayPal
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "")    # ID del webhook registrado en PayPal

# -------------------------------------------------------
# 1. Activar plan manualmente tras pago confirmado
#    (se llama desde el frontend al volver de PayPal)
# -------------------------------------------------------
class ActivateRequest(BaseModel):
    user_id: str
    plan: str                         # "premium"
    months: int = 1
    paypal_subscription_id: str = ""

@router.post("/activate")
def activate_plan(req: ActivateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    now_utc = datetime.now(timezone.utc)
    # Si ya tenía plan activo, extender desde la fecha actual de expiración
    base = user.plan_expires_at if (user.plan_expires_at and user.plan_expires_at > now_utc) else now_utc
    user.plan = req.plan
    user.plan_expires_at = base + timedelta(days=30 * req.months)
    user.paypal_subscription_id = req.paypal_subscription_id
    # Créditos ilimitados (999999) para premium
    user.credits = 999999

    tx = Transaction(
        user_id=user.id,
        type="credit_purchase",
        amount=9.99 * req.months,
        currency="EUR",
        status="completed",
        description=f"Plan {req.plan} x{req.months} mes(es) — PayPal {req.paypal_subscription_id}",
    )
    db.add(tx)
    db.commit()
    return {"ok": True, "plan": user.plan, "expires_at": user.plan_expires_at.isoformat()}

# -------------------------------------------------------
# 2. Webhook PayPal (IPN / REST) — activación automática
#    PayPal llama aquí cuando se completa un pago
# -------------------------------------------------------
@router.post("/webhook/paypal")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    data = {}
    try:
        data = json.loads(body)
    except Exception:
        pass

    import json as _json

    event_type = data.get("event_type", "")

    # SALE.COMPLETED o BILLING.SUBSCRIPTION.ACTIVATED
    if event_type in ("PAYMENT.SALE.COMPLETED", "BILLING.SUBSCRIPTION.ACTIVATED",
                      "BILLING.SUBSCRIPTION.RENEWED"):
        resource = data.get("resource", {})
        # Intentar obtener el email del pagador
        payer_email = (
            resource.get("subscriber", {}).get("email_address") or
            resource.get("payer", {}).get("email_address") or
            resource.get("payer_info", {}).get("email") or ""
        )
        subscription_id = resource.get("id", "")

        if payer_email:
            user = db.query(User).filter(User.email == payer_email).first()
            if user:
                now_utc = datetime.now(timezone.utc)
                base = user.plan_expires_at if (user.plan_expires_at and user.plan_expires_at > now_utc) else now_utc
                user.plan = "premium"
                user.plan_expires_at = base + timedelta(days=30)
                user.paypal_subscription_id = subscription_id
                user.credits = 999999
                db.commit()

    return {"received": True}

# -------------------------------------------------------
# 3. Consultar estado del plan del usuario
# -------------------------------------------------------
@router.get("/status/{user_id}")
def plan_status(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    now_utc = datetime.now(timezone.utc)
    active = (
        user.plan == "premium" and
        (user.plan_expires_at is None or user.plan_expires_at > now_utc)
    )
    return {
        "plan": user.plan if active else "free",
        "active": active,
        "expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
        "credits": user.credits,
    }
