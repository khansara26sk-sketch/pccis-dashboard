from fastapi import APIRouter

from app.routes import auth, dashboard, evidence, health, inspections, users

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(inspections.router)
api_router.include_router(evidence.router)
api_router.include_router(dashboard.router)