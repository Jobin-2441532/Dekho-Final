import os
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from app.core.config import settings
from app.core.logging_config import logger
from app.core.rate_limit import limiter
from app.api.endpoints import chat, dashboard, ingestion, features, auth, jobs, feedback, insights, ml_proxy, csv_import, home, expenses, wrap, notifications, support, grow, wealth
from app.services.retriever import retriever
from app.core.database import get_db
from app.services.storage import storage_service
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

scheduler = BackgroundScheduler()

# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown hooks
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Dekho API...")
    # Ensure all DB tables exist on every startup (safe: CREATE TABLE IF NOT EXISTS)
    from app.core.database import init_db
    init_db()
    logger.info("Database tables ready (Neon warmup complete).")
    # Removed FAISS pre-loading to prevent memory limits/hangs on Render free tier
    # if not retriever.is_ready:
    #     retriever.load()
    # logger.info("FAISS Initialized!")
    logger.info(f"MinIO available: {storage_service.is_available()}")

    from app.services.notification_jobs import run_daily_notifications
    scheduler.add_job(run_daily_notifications, "cron", hour=20, id="daily_notifications", replace_existing=True)
    scheduler.start()
    logger.info("Notification scheduler started (daily nudge job at 20:00 server time).")

    yield
    scheduler.shutdown(wait=False)
    logger.info("Dekho API shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Dekho API",
    description="Backend for Dekho — a habit-first personal finance companion",
    version="0.1.0",
    lifespan=lifespan,
    # Disable default /docs and /redoc in production via env var
    docs_url="/docs" if os.getenv("ENV", "development") != "production" else None,
    redoc_url=None,
)

# Attach rate limiter to the app
app.state.limiter = limiter

# ---------------------------------------------------------------------------
# Rate-limit error handler — returns JSON 429 instead of HTML
# ---------------------------------------------------------------------------
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(f"Rate limit exceeded: {request.client.host} {request.url.path}")
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    err_detail = f"Error ({type(exc).__name__}): {str(exc)}"
    response = JSONResponse(
        status_code=500,
        content={"detail": err_detail},
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# ---------------------------------------------------------------------------
# CORS — tightened to known frontend origins only
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://dekho.vercel.app",
    "https://dekho-app.vercel.app",
    "https://dekhoapp.vercel.app",
]

env_origin = os.getenv("FRONTEND_ORIGIN")
if env_origin and env_origin not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(env_origin)

is_prod = os.getenv("ENV", "development") == "production"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if is_prod else ["*"],
    allow_origin_regex=None if is_prod else r"https?://.*",
    allow_credentials=True if is_prod else False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

@app.on_event("startup")
def run_db_migrations():
    from app.core.database import engine, Base
    from app.models.financial import Budget # ensure model is registered
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='budgets' AND column_name='section';")).fetchone()
            if not res:
                logger.info("budgets.section column missing — recreating budgets table")
                conn.execute(text("DROP TABLE IF EXISTS budgets CASCADE;"))
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully verified budgets table schema")
    except Exception as e:
        logger.warning(f"Database startup auto-migration notice: {e}")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to Ask Dekho API", "version": "0.1.0"}


@app.api_route("/health", methods=["GET", "HEAD"], tags=["health"])
async def health(db: Session = Depends(get_db)):
    """Enhanced health check — reports status of all backend services including DB."""
    db_status = "ok"
    db_error = None
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "unavailable"
        db_error = str(e)
        
    return {
        "status": "healthy" if db_status == "ok" else "unhealthy",
        "services": {
            "api": "ok",
            "database": db_status,
            "db_error": db_error,
            "minio": "ok" if storage_service.is_available() else "unavailable",
        },
    }

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(ingestion.router, prefix="/api/v1/ingest", tags=["ingestion"])
app.include_router(features.router, prefix="/api/v1/features", tags=["features"])
app.include_router(feedback.router,  prefix="/api/v1/feedback",  tags=["feedback"])
app.include_router(jobs.router,      prefix="/api/v1/jobs",      tags=["jobs"])
app.include_router(insights.router,  prefix="/api/v1/insights",  tags=["insights"])
app.include_router(ml_proxy.router,   prefix="/api/v1/ml",     tags=["ml"])
app.include_router(csv_import.router, prefix="/api/v1/import", tags=["import"])
app.include_router(home.router, prefix="/api/home", tags=["home"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["expenses"])
app.include_router(wrap.router, prefix="/api/v1/wrap", tags=["wrap"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(support.router, prefix="/api/v1/support", tags=["support"])
app.include_router(grow.router, prefix="/api/v1/grow", tags=["grow"])
app.include_router(wealth.router, prefix="/api/v1/wealth", tags=["wealth"])
