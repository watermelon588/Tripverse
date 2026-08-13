import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, trips
from app.core.config import settings
from app.core.database import close_db

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} (env={settings.APP_ENV}, port={settings.PORT})...")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend gateway service for TripVerse agentic travel-planning workspace",
    version=settings.VERSION,
    lifespan=lifespan,
    debug=settings.DEBUG,
)

# CORS configuration strictly restricted to configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(trips.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)

