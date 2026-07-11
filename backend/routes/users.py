# ============================================================
# API Routes — Usuarios + Autenticación
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User

router = APIRouter(prefix="/api/users", tags=["users"])


class LoginRequest(BaseModel):
    email: str
    name: str | None = None


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        user.last_login = __import__("datetime").datetime.now(__import__("pytz").timezone("Europe/Madrid"))
        user.name = req.name or user.name
        db.commit()
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "credits": user.credits,
            "balance": user.balance,
            "name": user.name,
        }

    is_admin = req.email == "joanlazaro83@gmail.com"
    user = User(
        email=req.email,
        name=req.name or "",
        role="admin" if is_admin else "user",
        credits=99999 if is_admin else 10,
        balance=0.0,
        total_earned=0.0,
    )
    db.add(user)
    db.commit()
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "credits": user.credits,
        "balance": user.balance,
        "name": user.name,
    }


@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "credits": user.credits,
        "balance": user.balance,
        "total_earned": user.total_earned,
        "name": user.name,
        "paypal_email": user.paypal_email,
    }


@router.get("/")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "credits": u.credits,
            "balance": u.balance,
            "name": u.name,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]