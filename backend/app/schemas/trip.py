from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import (
    ConversationSessionStatus,
    ConversationStage,
    MessageRole,
    MessageType,
    OnboardingStatus,
    TripStatus,
)


# Legacy 3D Graph schemas (for /api/trips/demo)
class NodeType(str, Enum):
    COUNTRY = "COUNTRY"
    CITY = "CITY"
    NEIGHBORHOOD = "NEIGHBORHOOD"
    ATTRACTION = "ATTRACTION"
    RESTAURANT = "RESTAURANT"
    ACTIVITY = "ACTIVITY"
    HOTEL = "HOTEL"
    TRANSPORT = "TRANSPORT"


class GraphNode(BaseModel):
    id: str
    type: NodeType
    name: str
    description: Optional[str] = None
    position: Optional[Tuple[float, float, float]] = Field(
        default=None, description="3D coordinates [x, y, z]"
    )


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str
    cost: Optional[float] = None
    duration: Optional[float] = None


class DemoTripResponse(BaseModel):
    id: str
    destination: str
    days: int
    budget: float
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# Session 2 API Schemas

class ConversationMessageResponse(BaseModel):
    id: UUID
    role: MessageRole
    message_type: MessageType
    content: Optional[str] = None
    payload: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationSessionResponse(BaseModel):
    id: UUID
    trip_id: UUID
    status: ConversationSessionStatus
    current_stage: ConversationStage
    context_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripResponse(BaseModel):
    id: UUID
    user_id: Optional[str] = None
    guest_id: Optional[str] = None
    destination: Optional[str] = None

    origin_text: Optional[str] = None
    origin_latitude: Optional[float] = None
    origin_longitude: Optional[float] = None
    duration_days: Optional[int] = None
    currency: str = "INR"
    status: TripStatus
    onboarding_status: OnboardingStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



class TripStateResponse(BaseModel):
    trip: TripResponse
    conversation: ConversationSessionResponse


class TripCreateResponse(BaseModel):
    trip_id: UUID
    session_id: UUID
    assistant_message: ConversationMessageResponse


class SendMessageRequest(BaseModel):
    message_type: MessageType = MessageType.TEXT
    content: Optional[str] = None
    payload: Optional[dict] = None

    @model_validator(mode="after")
    def validate_message_content_and_payload(self) -> "SendMessageRequest":
        if self.message_type == MessageType.TEXT:
            if not self.content or not self.content.strip():
                raise ValueError("Text message content must be non-empty.")
        elif self.message_type == MessageType.UI_ACTION:
            if not self.payload:
                raise ValueError("UI_ACTION message must include a non-null payload.")
            action = self.payload.get("action")
            if action == "SET_LOCATION":
                lat = self.payload.get("latitude")
                lon = self.payload.get("longitude")
                if lat is None or not isinstance(lat, (int, float)) or not (-90 <= lat <= 90):
                    raise ValueError("Latitude must be a float between -90 and 90.")
                if lon is None or not isinstance(lon, (int, float)) or not (-180 <= lon <= 180):
                    raise ValueError("Longitude must be a float between -180 and 180.")
            else:
                raise ValueError(f"Unsupported UI_ACTION action: '{action}'")
        return self


class ConversationMessageListResponse(BaseModel):
    messages: List[ConversationMessageResponse]
