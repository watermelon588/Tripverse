from fastapi import APIRouter
from app.data.demo_trip import DEMO_TRIP_DATA
from app.schemas.trip import TripResponse

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("/demo", response_model=TripResponse)
def get_demo_trip():
    """Returns the hardcoded 3D demo trip graph for Japan."""
    return DEMO_TRIP_DATA
