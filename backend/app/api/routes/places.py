from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import RequestIdentity, get_request_identity
from app.schemas.places import PlaceMediaRequest
from app.services.place_media import get_place_media

router = APIRouter(prefix="/api/places", tags=["places"])


@router.post("/media")
async def place_media(
    request: PlaceMediaRequest,
    identity: RequestIdentity = Depends(get_request_identity),
):
    """Credited, free-licensed photos for itinerary places, for signed-in users and guests alike."""
    # get_request_identity accepts a request with neither identity; refuse it so we aren't an open proxy.
    if not identity.user_id and not identity.guest_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in or continue as a guest.")
    return await get_place_media(request)
