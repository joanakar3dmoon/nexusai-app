# ============================================================
# API Routes — Aplicaciones generadas
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from database import get_db
from models import App, User, Transaction

router = APIRouter(prefix="/api/apps", tags=["apps"])


class CreateAppRequest(BaseModel):
    user_id: str
    name: str
    description: str
    category: str = "general"
    prompt: str
    source_code: str
    monetization: dict = {}


class PublishAppRequest(BaseModel):
    app_id: str


@router.post("/create")
def create_app(req: CreateAppRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.credits < 1:
        raise HTTPException(400, "Créditos insuficientes")

    app = App(
        user_id=req.user_id,
        name=req.name,
        description=req.description,
        category=req.category,
        prompt=req.prompt,
        source_code=req.source_code,
        status="draft",
        monetization=req.monetization,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(app)

    # Descontar crédito
    user.credits -= 1
    db.commit()

    return {"id": app.id, "status": "draft"}


@router.post("/publish")
def publish_app(req: PublishAppRequest, db: Session = Depends(get_db)):
    app = db.query(App).filter(App.id == req.app_id).first()
    if not app:
        raise HTTPException(404, "App no encontrada")

    app.status = "published"
    app.updated_at = datetime.now(timezone.utc)

    # Registrar transacción de publicación
    tx = Transaction(
        user_id=app.user_id,
        type="credit_purchase",
        amount=-5,
        currency="EUR",
        description=f'Publicación de "{app.name}"',
        metadata_json={"app_id": app.id},
    )
    db.add(tx)
    db.commit()
    return {"status": "published"}


@router.get("/user/{user_id}")
def list_user_apps(user_id: str, db: Session = Depends(get_db)):
    apps = (
        db.query(App)
        .filter(App.user_id == user_id)
        .order_by(App.created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "category": a.category,
            "status": a.status,
            "views": a.views,
            "downloads": a.downloads,
            "revenue": a.revenue,
            "created_at": a.created_at.isoformat(),
        }
        for a in apps
    ]


@router.get("/all")
def list_all_apps(db: Session = Depends(get_db)):
    apps = db.query(App).order_by(App.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "name": a.name,
            "description": a.description,
            "status": a.status,
            "views": a.views,
            "revenue": a.revenue,
            "created_at": a.created_at.isoformat(),
        }
        for a in apps
    ]


class UpdateAppRequest(BaseModel):
    app_id: str
    source_code: str | None = None
    name: str | None = None
    status: str | None = None


@router.put("/update")
def update_app(req: UpdateAppRequest, db: Session = Depends(get_db)):
    app = db.query(App).filter(App.id == req.app_id).first()
    if not app:
        raise HTTPException(404, "App no encontrada")
    if req.source_code is not None:
        app.source_code = req.source_code
    if req.name is not None:
        app.name = req.name
    if req.status is not None:
        app.status = req.status
    app.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "updated", "id": app.id}


@router.get("/{app_id}")
def get_app(app_id: str, db: Session = Depends(get_db)):
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise HTTPException(404)
    return {
        "id": app.id,
        "name": app.name,
        "description": app.description,
        "source_code": app.source_code,
        "status": app.status,
        "monetization": app.monetization,
        "views": app.views,
        "downloads": app.downloads,
        "created_at": app.created_at.isoformat(),
    }


@router.post("/{app_id}/view")
def record_view(app_id: str, db: Session = Depends(get_db)):
    app = db.query(App).filter(App.id == app_id).first()
    if app:
        app.views += 1
        db.commit()
    return {"ok": True}