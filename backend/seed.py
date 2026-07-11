# ============================================================
# SEED DATA — Datos iniciales para la base de datos
# Se ejecuta en el primer arranque si no hay datos
# ============================================================

from sqlalchemy.orm import Session
from database import SessionLocal, init_db
from models import User, App, Setting, Transaction, Investment
from datetime import datetime, timezone

ADMIN_EMAIL = "joanlazaro83@gmail.com"
ADMIN_NAME = "Joan"


def seed():
    init_db()
    db = SessionLocal()
    try:
        # Solo sembrar si no hay usuarios
        existing = db.query(User).first()
        if existing:
            return

        print("🌱 Sembrando datos iniciales...")

        # Admin
        admin = User(
            email=ADMIN_EMAIL,
            name=ADMIN_NAME,
            role="admin",
            credits=99999,
            balance=127.50,
            total_earned=127.50,
            paypal_email=ADMIN_EMAIL,
        )
        db.add(admin)
        db.flush()

        # App demo 1
        app1 = App(
            user_id=admin.id,
            name="NexusRadio",
            description="App de radio online con chat IA integrado y enlaces Amazon afiliados",
            category="entretenimiento",
            prompt="App de radio con streaming y chat IA",
            source_code="<!DOCTYPE html><html><body><h1>NexusRadio</h1></body></html>",
            status="published",
            views=342,
            downloads=18,
            revenue=5.20,
            monetization={"admob": True, "amazon": True, "freellm": True, "pwa": True},
        )
        db.add(app1)

        # App demo 2
        app2 = App(
            user_id=admin.id,
            name="FitTracker",
            description="App de seguimiento fitness con rutinas y planes de entrenamiento",
            category="salud",
            prompt="App de ejercicios y rutinas fitness",
            source_code="<!DOCTYPE html><html><body><h1>FitTracker</h1></body></html>",
            status="published",
            views=891,
            downloads=45,
            revenue=12.80,
            monetization={"admob": True, "amazon": True, "freellm": False, "pwa": True},
        )
        db.add(app2)

        # App demo 3
        app3 = App(
            user_id=admin.id,
            name="RecipeAI",
            description="App de recetas con inteligencia artificial que sugiere platos",
            category="comida",
            prompt="App de recetas con IA",
            source_code="<!DOCTYPE html><html><body><h1>RecipeAI</h1></body></html>",
            status="draft",
            views=0,
            downloads=0,
            revenue=0.0,
            monetization={"admob": True, "amazon": True, "freellm": True, "pwa": True},
        )
        db.add(app3)

        # Transacciones demo
        tx1 = Transaction(
            user_id=admin.id,
            type="ad_revenue",
            amount=8.50,
            currency="EUR",
            status="completed",
            description="Ingresos AdMob — NexusRadio",
            metadata_json={"app_id": app1.id, "source": "admob"},
        )
        db.add(tx1)

        tx2 = Transaction(
            user_id=admin.id,
            type="ad_revenue",
            amount=15.30,
            currency="EUR",
            status="completed",
            description="Ingresos AdMob — FitTracker",
            metadata_json={"app_id": app2.id, "source": "admob"},
        )
        db.add(tx2)

        tx3 = Transaction(
            user_id=admin.id,
            type="amazon_commission",
            amount=3.70,
            currency="EUR",
            status="completed",
            description="Comisión Amazon Afiliados",
            metadata_json={"source": "amazon"},
        )
        db.add(tx3)

        # Settings por defecto
        settings = [
            Setting(key="platform_name", value="NexusAI", description="Nombre de la plataforma"),
            Setting(key="amazon_tracking_id", value="r3dm01-21", description="Amazon Tracking ID"),
            Setting(key="paypal_admin_email", value=ADMIN_EMAIL, description="PayPal del admin para retiros"),
            Setting(key="default_credits", value="10", description="Créditos iniciales para nuevos usuarios"),
            Setting(key="withdrawal_minimum", value="20", description="Mínimo para solicitar retiro (EUR)"),
            Setting(key="revenue_split", value="0.7", description="Porcentaje para el creador (0.7 = 70%)"),
        ]
        for s in settings:
            db.add(s)

        db.commit()
        print("✅ Seed completado — admin, apps demo, settings y transacciones creados")

    except Exception as e:
        db.rollback()
        print(f"❌ Error en seed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()