import re
from typing import Dict, Any, Optional, Tuple

from app.models.enums import (
    ConversationSessionStatus,
    ConversationStage,
    MessageRole,
    MessageType,
    OnboardingStatus,
    TripStatus,
)
from app.models.trip import ConversationMessage, ConversationSession, Trip


def extract_trip_info(
    content: Optional[str],
    payload: Optional[dict],
    message_type: MessageType,
    current_trip: Trip,
) -> Dict[str, Any]:
    """Extract destination, duration_days, and origin fields from user input."""
    updates: Dict[str, Any] = {}

    if message_type == MessageType.UI_ACTION and payload:
        if payload.get("action") == "SET_LOCATION":
            updates["origin_latitude"] = payload.get("latitude")
            updates["origin_longitude"] = payload.get("longitude")
            if payload.get("label"):
                updates["origin_text"] = payload["label"]
            elif not current_trip.origin_text:
                updates["origin_text"] = f"{payload.get('latitude')}, {payload.get('longitude')}"
        return updates

    if message_type == MessageType.TEXT and content:
        text = content.strip()

        # 1. Extract Duration (days / weeks)
        duration_match = re.search(r'(\d+)\s*(days?|weeks?)', text, re.IGNORECASE)
        if duration_match:
            num = int(duration_match.group(1))
            unit = duration_match.group(2).lower()
            days = num * 7 if "week" in unit else num
            if 1 <= days <= 365:
                updates["duration_days"] = days

        # 2. Extract Origin (e.g. "from Kolkata", "starting from New York")
        origin_match = re.search(
            r'(?:from|starting in|flying out of|leaving from)\s+([A-Za-z\s,]+)',
            text,
            re.IGNORECASE,
        )
        if origin_match:
            raw_origin = origin_match.group(1).strip()
            # Clean up residual trailing text if any
            raw_origin = re.sub(r'\s+(?:for|for\s+\d+).*', '', raw_origin, flags=re.IGNORECASE)
            if raw_origin:
                updates["origin_text"] = raw_origin.title()

        # 3. Extract Destination
        # Clean text by stripping known duration & origin clauses to find destination candidate
        cleaned_dest = text
        if duration_match:
            cleaned_dest = cleaned_dest.replace(duration_match.group(0), "")
        if origin_match:
            cleaned_dest = cleaned_dest.replace(origin_match.group(0), "")

        # Strip common phrase prefixes
        cleaned_dest = re.sub(
            r'^(?:i\s+want\s+to\s+go\s+to|heading\s+to|trip\s+to|let\'?s\s+go\s+to|visit|head\s+out\s+to|for|from)\s+',
            '',
            cleaned_dest.strip(),
            flags=re.IGNORECASE,
        )
        # Strip trailing "for" or punctuation
        cleaned_dest = re.sub(r'\s+(?:for|from)\s*$', '', cleaned_dest.strip(), flags=re.IGNORECASE)
        cleaned_dest = cleaned_dest.strip(" ,.!")

        # If a valid string remains and destination wasn't set, use it
        if cleaned_dest and len(cleaned_dest) <= 255:
            # Check if cleaned_dest is not just a duration or origin response
            if not current_trip.destination and not (duration_match and cleaned_dest.isdigit()):
                updates["destination"] = cleaned_dest.title()
            elif current_trip.destination and current_trip.duration_days and not current_trip.origin_text:
                # If destination & duration are already set, a short single word reply is likely origin
                if "origin_text" not in updates and not origin_match:
                    updates["origin_text"] = cleaned_dest.title()

    return updates


def determine_next_step(
    trip: Trip, session: ConversationSession
) -> Tuple[ConversationStage, str]:
    """Select the next conversational prompt based on current trip state."""
    # Check onboarding completion criteria
    if trip.destination is not None and trip.duration_days is not None:
        trip.onboarding_status = OnboardingStatus.COMPLETE
        trip.status = TripStatus.PLANNING
        session.status = ConversationSessionStatus.COMPLETED
        session.current_stage = ConversationStage.COMPLETE
        
        origin_str = f" starting from {trip.origin_text}" if trip.origin_text else ""
        message_content = (
            f"Perfect! We have {trip.duration_days} days in {trip.destination}{origin_str}. "
            f"We're ready to start planning!"
        )
        return ConversationStage.COMPLETE, message_content

    # If destination missing
    if trip.destination is None:
        session.current_stage = ConversationStage.TRIP_BASICS
        return ConversationStage.TRIP_BASICS, "Where do you want to head out to?"

    # If duration missing
    if trip.duration_days is None:
        session.current_stage = ConversationStage.TRIP_BASICS
        return (
            ConversationStage.TRIP_BASICS,
            f"Nice! How many days are you thinking for {trip.destination}?",
        )

    # If origin missing
    if trip.origin_text is None and trip.origin_latitude is None:
        session.current_stage = ConversationStage.ORIGIN
        return (
            ConversationStage.ORIGIN,
            f"Got it — {trip.duration_days} days in {trip.destination}. Where will you be travelling from?",
        )

    session.current_stage = ConversationStage.REVIEW
    return (
        ConversationStage.REVIEW,
        f"Looking great! Trip to {trip.destination} for {trip.duration_days} days.",
    )


def process_user_message(
    trip: Trip,
    session: ConversationSession,
    content: Optional[str],
    payload: Optional[dict],
    message_type: MessageType,
) -> ConversationMessage:
    """Processes incoming user message, updates trip state, and returns assistant message."""
    # 1. Extract trip information updates
    extracted = extract_trip_info(content, payload, message_type, trip)

    for field, val in extracted.items():
        if val is not None:
            setattr(trip, field, val)

    # 2. Determine next onboarding stage and assistant question
    next_stage, assistant_content = determine_next_step(trip, session)

    # 3. Create assistant message
    assistant_msg = ConversationMessage(
        session_id=session.id,
        role=MessageRole.ASSISTANT,
        message_type=MessageType.TEXT,
        content=assistant_content,
        payload=None,
    )

    return assistant_msg
