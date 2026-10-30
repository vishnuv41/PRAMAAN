from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.security import authorize_api_request, get_current_principal
from app.routers import (
    dashboard,
    institution,
    aicte,
    students,
    enrolments,
    alerts,
    validation,
    intake,
    analytics,
    certificates,
    consent,
    verifier,
    reports,
    audit,
    auth,
    transfers
)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="APAAR ID-based student data management, temporal enrolment integrity, explainable conflict detection, and institutional compliance platform for AICTE-approved institutions.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": "prototype"
    }

# Mount API Routers
api_auth = [Depends(get_current_principal), Depends(authorize_api_request)]
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(institution.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(aicte.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(students.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(enrolments.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(alerts.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(validation.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(intake.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(certificates.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(consent.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(verifier.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(transfers.router, prefix=settings.API_V1_PREFIX, dependencies=api_auth)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
