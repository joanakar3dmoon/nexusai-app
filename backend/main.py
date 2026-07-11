# ============================================================
# NEXUSAI BACKEND — Servidor FastAPI
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db

from routes.users import router as users_router
from routes.apps import router as apps_router
from routes.finance import router as finance_router

app = FastAPI(title="NexusAI Backend", version="1.0.0")

# CORS — permitir frontend desde GitHub Pages o local
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://joanakar3dmoon.github.io",
        "https://*.convex.cloud",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar DB al arrancar
@app.on_event("startup")
def startup():
    init_db()

# Health check
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0", "name": "NexusAI Backend"}

# Rutas
app.include_router(users_router)
app.include_router(apps_router)
app.include_router(finance_router)