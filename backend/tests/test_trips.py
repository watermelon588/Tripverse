import json
from unittest.mock import AsyncMock, patch
import uuid
import time
import pytest
import jwt
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from conftest import TestingSessionLocal
from app.models.trip import ConversationMessage


def create_mock_jwt(user_id: str, email: str = "test@tripverse.ai") -> str:
    """Generate a mock JWT token for testing."""
    if not settings.SUPABASE_URL:
        settings.SUPABASE_URL = "https://mock.supabase.co"
    if not settings.SUPABASE_JWT_SECRET:
        settings.SUPABASE_JWT_SECRET = "test_secret_for_tests"
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
        "exp": int(time.time()) + 3600,
        "email": email,
        "role": "authenticated",
        "user_metadata": {"full_name": "Test User"},
    }
    secret = settings.SUPABASE_JWT_SECRET or "test_secret_for_tests"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_create_trip_anonymous(client: AsyncClient):
    """Verify POST /api/trips creates trip when neither header is provided."""
    response = await client.post("/api/trips")
    assert response.status_code == 201
    data = response.json()

    assert "trip_id" in data
    assert "session_id" in data
    assert "assistant_message" in data
    assert data["assistant_message"]["role"] == "ASSISTANT"
    assert len(data["assistant_message"]["content"]) > 0


@pytest.mark.asyncio
async def test_guest_identity_flow(client: AsyncClient):
    """Verify Guest A creates trip, accesses it, and Guest B is rejected with 403."""
    guest_a = str(uuid.uuid4())
    guest_b = str(uuid.uuid4())

    # 1. Guest A creates trip
    create_res = await client.post(
        "/api/trips",
        headers={"X-Guest-ID": guest_a},
    )
    assert create_res.status_code == 201
    trip_id = create_res.json()["trip_id"]

    # 2. Guest A accesses trip
    get_res_a = await client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Guest-ID": guest_a},
    )
    assert get_res_a.status_code == 200
    assert get_res_a.json()["trip"]["guest_id"] == guest_a
    assert get_res_a.json()["trip"]["user_id"] is None

    # 3. Guest A sends message
    msg_res_a = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers={"X-Guest-ID": guest_a},
        json={"message_type": "TEXT", "content": "Tokyo"},
    )
    assert msg_res_a.status_code == 200

    # 4. Guest B tries to access Guest A's trip -> 403 Forbidden
    get_res_b = await client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Guest-ID": guest_b},
    )
    assert get_res_b.status_code == 403

    # 5. Guest B tries to send message to Guest A's trip -> 403 Forbidden
    msg_res_b = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers={"X-Guest-ID": guest_b},
        json={"message_type": "TEXT", "content": "Kyoto"},
    )
    assert msg_res_b.status_code == 403


@pytest.mark.asyncio
async def test_route_metrics_is_guest_scoped_and_keyless_safe(client: AsyncClient):
    guest = str(uuid.uuid4())
    created = await client.post("/api/trips", headers={"X-Guest-ID": guest})
    trip_id = created.json()["trip_id"]
    payload = {"legs": [{"id": "leg-1", "from_lat": 35.68, "from_lon": 139.69,
                         "to_lat": 35.01, "to_lon": 135.76}]}
    with patch.object(settings, "ORS_API_KEY", ""):
        response = await client.post(f"/api/trips/{trip_id}/route-metrics",
                                     headers={"X-Guest-ID": guest}, json=payload)
    assert response.status_code == 200
    assert response.json() == {"provider": "unavailable", "legs": []}
    forbidden = await client.post(f"/api/trips/{trip_id}/route-metrics",
                                  headers={"X-Guest-ID": str(uuid.uuid4())}, json=payload)
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_existing_itinerary_graph_backfills_once_and_is_guest_scoped(client: AsyncClient):
    guest = str(uuid.uuid4())
    headers = {"X-Guest-ID": guest}
    created = await client.post("/api/trips", headers=headers)
    trip_id = created.json()["trip_id"]
    planned = await client.post(f"/api/trips/{trip_id}/messages", headers=headers,
                                json={"message_type": "UI_ACTION", "payload": {
                                    "action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi",
                                    "destination": "Japan", "duration_days": 5,
                                    "places_to_visit": ["Tokyo", "Kyoto"],
                                }})
    assert planned.status_code == 200
    assert planned.json()["assistant_message"]["payload"]["action"] == "SHOW_PLANNING_CHOICE"
    planned = await client.post(f"/api/trips/{trip_id}/messages", headers=headers,
                                json={"message_type": "UI_ACTION", "payload": {
                                    "action": "GENERATE_FULL_ITINERARY",
                                }})
    assert planned.status_code == 200
    graph = planned.json()["assistant_message"]["payload"]["graph"]

    async with TestingSessionLocal() as db:
        result = await db.execute(select(ConversationMessage).where(
            ConversationMessage.id == uuid.UUID(planned.json()["assistant_message"]["id"])))
        message = result.scalar_one()
        message.payload = None
        await db.commit()

    with patch("app.agents.trip_planner.nodes.extract_itinerary_node.extract_itinerary",
               new_callable=AsyncMock, return_value={"itinerary_graph": graph}) as extract:
        first = await client.post(f"/api/trips/{trip_id}/itinerary-graph", headers=headers)
        second = await client.post(f"/api/trips/{trip_id}/itinerary-graph", headers=headers)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json() == graph
    extract.assert_awaited_once()
    forbidden = await client.post(f"/api/trips/{trip_id}/itinerary-graph",
                                  headers={"X-Guest-ID": str(uuid.uuid4())})
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_authenticated_user_identity_flow(client: AsyncClient):
    """Verify User A creates trip, accesses it, and User B / Guest are rejected with 403."""
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())
    token_a = create_mock_jwt(user_a_id, "user_a@tripverse.ai")
    token_b = create_mock_jwt(user_b_id, "user_b@tripverse.ai")
    guest_uuid = str(uuid.uuid4())

    # 1. User A creates trip
    create_res = await client.post(
        "/api/trips",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_res.status_code == 201
    trip_id = create_res.json()["trip_id"]

    # 2. User A accesses trip
    get_res_a = await client.get(
        f"/api/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert get_res_a.status_code == 200
    assert get_res_a.json()["trip"]["user_id"] == user_a_id
    assert get_res_a.json()["trip"]["guest_id"] is None

    # 3. User B tries to access User A's trip -> 403 Forbidden
    get_res_b = await client.get(
        f"/api/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res_b.status_code == 403

    # 4. Guest tries to access User A's trip -> 403 Forbidden
    get_res_guest = await client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Guest-ID": guest_uuid},
    )
    assert get_res_guest.status_code == 403


@pytest.mark.asyncio
async def test_dual_identity_conflict_rejected(client: AsyncClient):
    """Verify request with BOTH Authorization and X-Guest-ID is rejected with 400."""
    user_id = str(uuid.uuid4())
    token = create_mock_jwt(user_id)
    guest_id = str(uuid.uuid4())

    res = await client.post(
        "/api/trips",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Guest-ID": guest_id,
        },
    )
    assert res.status_code == 400
    assert "both" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_guest_id_format_rejected(client: AsyncClient):
    """Verify malformed non-UUID X-Guest-ID header is rejected with 400."""
    res = await client.post(
        "/api/trips",
        headers={"X-Guest-ID": "invalid-guest-not-a-uuid"},
    )
    assert res.status_code == 400
    assert "invalid x-guest-id" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_form_onboarding_persists_places_and_plan(client: AsyncClient):
    guest_id = str(uuid.uuid4())
    headers = {"X-Guest-ID": guest_id}
    created = await client.post("/api/trips", headers=headers)
    assert created.status_code == 201
    assert created.json()["assistant_message"]["payload"] is None
    trip_id = created.json()["trip_id"]

    response = await client.post(
        f"/api/trips/{trip_id}/messages", headers=headers,
        json={"message_type": "UI_ACTION", "payload": {
            "action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi",
            "destination": "Japan", "places_to_visit": ["Tokyo", "Kyoto"],
            "duration_days": 8,
            "planning_preferences": {
                "pace": "relaxed", "interests": ["Food", "Architecture"],
                "avoid": ["Early starts"],
            },
        }},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["trip"]["onboarding_status"] == "COMPLETE"
    assert data["trip"]["origin_text"] == "Delhi"
    assert data["trip"]["destination"] == "Japan"
    assert data["trip"]["places_to_visit"] == ["Tokyo", "Kyoto"]
    assert data["trip"]["duration_days"] == 8
    assert data["trip"]["planning_preferences"] == {
        "pace": "relaxed", "interests": ["Food", "Architecture"], "avoid": ["Early starts"],
        # brief v2 defaults when the form leaves them out
        "start_date": None, "adults": 1, "children": 0, "comfort": "mid_range",
        "travel_mode": "transit", "guide": None, "home_currency": None,
    }
    assert data["conversation"]["current_stage"] == "REVIEW"
    assert data["trip"]["status"] == "DRAFT"
    assert data["assistant_message"]["content"]
    assert data["assistant_message"]["payload"]["action"] == "SHOW_PLANNING_CHOICE"

    generated = await client.post(f"/api/trips/{trip_id}/messages", headers=headers,
                                  json={"message_type": "UI_ACTION", "payload": {
                                      "action": "GENERATE_FULL_ITINERARY",
                                  }})
    assert generated.status_code == 200
    assert generated.json()["conversation"]["current_stage"] == "COMPLETE"
    assert generated.json()["assistant_message"]["payload"]["kind"] == "ITINERARY_GRAPH"

    late_edit = await client.post(f"/api/trips/{trip_id}/messages", headers=headers,
                                  json={"message_type": "UI_ACTION", "payload": {
                                      "action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi",
                                      "destination": "Japan", "duration_days": 8,
                                  }})
    assert late_edit.status_code == 409

    restored = await client.get(f"/api/trips/{trip_id}", headers=headers)
    assert restored.json()["trip"]["places_to_visit"] == ["Tokyo", "Kyoto"]
    assert restored.json()["trip"]["planning_preferences"]["avoid"] == ["Early starts"]
    messages = await client.get(f"/api/trips/{trip_id}/messages", headers=headers)
    assert len(messages.json()["messages"]) == 5


@pytest.mark.asyncio
async def test_text_before_form_submission_keeps_form(client: AsyncClient):
    created = await client.post("/api/trips")
    trip_id = created.json()["trip_id"]
    response = await client.post(
        f"/api/trips/{trip_id}/messages",
        json={"message_type": "TEXT", "content": "Japan for 10 days"},
    )
    assert response.status_code == 200
    assert response.json()["trip"]["destination"] == "Japan"
    assert response.json()["assistant_message"]["payload"]["action"] == "SHOW_ONBOARDING_FORM"


@pytest.mark.asyncio
async def test_invalid_form_is_rejected(client: AsyncClient):
    created = await client.post("/api/trips")
    trip_id = created.json()["trip_id"]
    response = await client.post(
        f"/api/trips/{trip_id}/messages",
        json={"message_type": "UI_ACTION", "payload": {
            "action": "SUBMIT_TRIP_ONBOARDING", "origin": " ",
            "destination": "Japan", "duration_days": 0,
            "places_to_visit": ["Tokyo"],
        }},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_planning_preference_is_rejected(client: AsyncClient):
    created = await client.post("/api/trips")
    response = await client.post(
        f"/api/trips/{created.json()['trip_id']}/messages",
        json={"message_type": "UI_ACTION", "payload": {
            "action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi",
            "destination": "Japan", "duration_days": 8,
            "planning_preferences": {"pace": "extreme", "interests": [], "avoid": []},
        }},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_planning_preferences_can_be_revised_before_generation(client: AsyncClient):
    created = await client.post("/api/trips")
    trip_id = created.json()["trip_id"]
    base = {"action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi",
            "destination": "Japan", "duration_days": 8, "places_to_visit": ["Kyoto"]}
    first = await client.post(f"/api/trips/{trip_id}/messages",
                              json={"message_type": "UI_ACTION", "payload": {
                                  **base, "planning_preferences": {"pace": "packed"}}})
    assert first.status_code == 200
    revised = await client.post(f"/api/trips/{trip_id}/messages",
                                json={"message_type": "UI_ACTION", "payload": {
                                    **base, "planning_preferences": {
                                        "pace": "relaxed", "interests": ["Food"],
                                        "avoid": ["Early starts"],
                                    }}})
    assert revised.status_code == 200
    assert revised.json()["trip"]["planning_preferences"]["pace"] == "relaxed"
    assert revised.json()["assistant_message"]["payload"]["action"] == "SHOW_PLANNING_CHOICE"


@pytest.mark.asyncio
async def test_stream_form_submission(client: AsyncClient):
    created = await client.post("/api/trips")
    trip_id = created.json()["trip_id"]
    with patch("app.core.database.async_session_maker", TestingSessionLocal):
        response = await client.post(
            f"/api/trips/{trip_id}/messages/stream",
            json={"message_type": "UI_ACTION", "payload": {
                "action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi",
                "destination": "Japan", "duration_days": 5,
                "places_to_visit": ["Kyoto"],
            }},
        )
    assert response.status_code == 200
    events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]
    done = next(event for event in events if event["type"] == "done")
    assert done["trip"]["onboarding_status"] == "COMPLETE"
    assert done["trip"]["places_to_visit"] == ["Kyoto"]
    assert done["assistant_message"]["payload"]["action"] == "SHOW_PLANNING_CHOICE"
    assert any(event["type"] == "token" for event in events)

    with patch("app.core.database.async_session_maker", TestingSessionLocal):
        generated = await client.post(
            f"/api/trips/{trip_id}/messages/stream",
            json={"message_type": "UI_ACTION", "payload": {"action": "GENERATE_FULL_ITINERARY"}},
        )
    generated_events = [json.loads(line[6:]) for line in generated.text.splitlines() if line.startswith("data: ")]
    generated_done = next(event for event in generated_events if event["type"] == "done")
    assert generated_done["assistant_message"]["payload"]["graph"]["nodes"]


@pytest.mark.asyncio
async def test_get_trip_state_and_messages(client: AsyncClient):
    created = await client.post("/api/trips")
    trip_id = created.json()["trip_id"]
    state = await client.get(f"/api/trips/{trip_id}")
    assert state.status_code == 200
    assert state.json()["trip"]["onboarding_status"] == "IN_PROGRESS"
    messages = await client.get(f"/api/trips/{trip_id}/messages")
    assert messages.status_code == 200
    assert messages.json()["messages"][0]["payload"] is None


@pytest.mark.asyncio
async def test_missing_trip_returns_404(client: AsyncClient):
    """Verify 404 for non-existent trip ID."""
    random_uuid = str(uuid.uuid4())
    res = await client.get(f"/api/trips/{random_uuid}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_get_my_trips_unauthorized(client: AsyncClient):
    """Verify GET /api/trips/me returns 401 when unauthenticated."""
    res = await client.get("/api/trips/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_complete_first_message_still_shows_the_form_until_submitted(client: AsyncClient):
    """A first message with destination, days and origin must not skip the form (the client would hide it)."""
    headers = {"X-Guest-ID": str(uuid.uuid4())}
    trip_id = (await client.post("/api/trips", headers=headers)).json()["trip_id"]
    response = await client.post(f"/api/trips/{trip_id}/messages", headers=headers,
                                 json={"message_type": "TEXT", "content": "Plan 3 days in Kyoto from Delhi"})
    body = response.json()
    assert body["assistant_message"]["payload"]["action"] == "SHOW_ONBOARDING_FORM"
    assert body["trip"]["onboarding_status"] == "IN_PROGRESS"


async def _plan_one_shot(client: AsyncClient, headers: dict) -> str:
    trip_id = (await client.post("/api/trips", headers=headers)).json()["trip_id"]
    url = f"/api/trips/{trip_id}/messages"
    await client.post(url, headers=headers, json={"message_type": "UI_ACTION", "payload": {
        "action": "SUBMIT_TRIP_ONBOARDING", "origin": "Delhi", "destination": "Kyoto", "duration_days": 3}})
    await client.post(url, headers=headers, json={"message_type": "UI_ACTION", "payload": {
        "action": "GENERATE_FULL_ITINERARY"}})
    return trip_id


async def _stream(trip_id: str, headers: dict, text: str) -> list[dict]:
    import json
    from app.core.auth import RequestIdentity
    from app.schemas.trip import SendMessageRequest
    from app.services.conversation import conversation_service
    from conftest import TestingSessionLocal

    async with TestingSessionLocal() as db:
        return [json.loads(chunk[6:]) async for chunk in conversation_service.process_message_stream(
            db, uuid.UUID(trip_id), SendMessageRequest(message_type="TEXT", content=text),
            RequestIdentity(guest_id=headers["X-Guest-ID"]))]


@pytest.mark.asyncio
@pytest.mark.parametrize("intent, instruction, redraws_map", [
    ("update_trip", "REVISION_SYSTEM_INSTRUCTION", True),
    ("trip_question", "ANSWER_SYSTEM_INSTRUCTION", False),
])
async def test_one_shot_follow_ups_revise_or_answer_the_existing_plan(client: AsyncClient, intent, instruction, redraws_map):
    from unittest.mock import patch
    from app.agents.trip_planner.nodes import planning_trip_node
    from app.services.llm.service import llm_service

    headers = {"X-Guest-ID": str(uuid.uuid4())}
    trip_id = await _plan_one_shot(client, headers)
    seen = []

    async def fake_stream(prompt, system_instruction=None, **_):
        seen.append((prompt, system_instruction))
        yield "| Day 1 | Kyoto | **Fushimi Inari** |\n| Day 2 | Kyoto | **Okochi-Sanso** |"

    async def fake_understand(state):
        return {"intent": intent}

    with patch.object(llm_service, "generate_stream", new=fake_stream), \
            patch("app.agents.trip_planner.nodes.understand_user_msg_node.understand_user_message", new=fake_understand), \
            patch("app.agents.trip_planner.nodes.planning_trip_node.execute_planning_subgraph") as research:
        events = await _stream(trip_id, headers, "Swap day 2's afternoon for Okochi-Sanso")
    prompt, system = seen[0]
    assert system == getattr(planning_trip_node, instruction)
    assert "CURRENT ITINERARY:" in prompt and "Swap day 2's afternoon for Okochi-Sanso" in prompt
    research.assert_not_called()  # no fresh research for a follow-up
    assert any(e["type"] == "graph" for e in events) is redraws_map


def test_follow_up_questions_are_answered_even_when_the_intent_label_is_wrong():
    from app.services.conversation import _is_question

    assert _is_question("Is Fushimi Inari very crowded in the early morning?", "update_trip")
    assert _is_question("thanks!", "casual_conversation")
    assert not _is_question("Can you add Arashiyama bamboo grove on day 2 morning?", "update_trip")
    assert not _is_question("Swap day 2's afternoon for Okochi-Sanso", None)
