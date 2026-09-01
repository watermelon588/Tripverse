from typing import TypedDict


class TripPlanningState(TypedDict):
    trip_id: str
    user_id: str | None
    user_name: str | None
    guest_id: str | None
    user_message: str

    destination: str | None
    duration_days: int | None
    origin: str | None

    assistant_response: str