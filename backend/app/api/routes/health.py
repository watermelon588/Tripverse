from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_root():
    return {"name": "TripVerse API", "status": "ok"}


@router.get("/api/health")
def get_health():
    return {"status": "healthy"}
