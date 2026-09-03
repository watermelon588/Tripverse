import uuid
import pytest
import jwt
from httpx import AsyncClient

from app.core.config import settings


def create_mock_jwt(user_id: str, email: str = "test@tripverse.ai") -> str:
    """Generate a mock JWT token for testing."""
    payload = {
        "sub": user_id,
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
    assert data["assistant_message"]["content"] == "Where do you want to travel?"


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
async def test_single_field_onboarding_flow(client: AsyncClient):
    """Verify step-by-step onboarding (destination -> duration -> origin) with guest identity."""
    guest_id = str(uuid.uuid4())
    headers = {"X-Guest-ID": guest_id}

    # 1. Create trip
    create_res = await client.post("/api/trips", headers=headers)
    trip_id = create_res.json()["trip_id"]

    # 2. Send Destination "Japan"
    msg1_res = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers=headers,
        json={"message_type": "TEXT", "content": "Japan"},
    )
    assert msg1_res.status_code == 200
    d1 = msg1_res.json()
    assert d1["trip"]["destination"] == "Japan"
    assert d1["trip"]["duration_days"] is None
    assert d1["trip"]["onboarding_status"] == "IN_PROGRESS"

    # 3. Send Duration "10 days"
    msg2_res = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers=headers,
        json={"message_type": "TEXT", "content": "10 days"},
    )
    assert msg2_res.status_code == 200
    d2 = msg2_res.json()
    assert d2["trip"]["destination"] == "Japan"
    assert d2["trip"]["duration_days"] == 10
    assert d2["trip"]["onboarding_status"] == "COMPLETE"
    assert d2["trip"]["status"] == "PLANNING"


@pytest.mark.asyncio
async def test_multi_field_single_message(client: AsyncClient):
    """Verify 'Japan for 10 days from Kolkata' fills all fields and completes onboarding immediately."""
    guest_id = str(uuid.uuid4())
    headers = {"X-Guest-ID": guest_id}

    create_res = await client.post("/api/trips", headers=headers)
    trip_id = create_res.json()["trip_id"]

    msg_res = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers=headers,
        json={"message_type": "TEXT", "content": "Japan for 10 days from Kolkata"},
    )
    assert msg_res.status_code == 200
    data = msg_res.json()

    assert data["trip"]["destination"] == "Japan"
    assert data["trip"]["duration_days"] == 10
    assert data["trip"]["origin_text"] == "Kolkata"
    assert data["trip"]["onboarding_status"] == "COMPLETE"
    assert data["trip"]["status"] == "PLANNING"
    assert data["conversation"]["current_stage"] == "COMPLETE"


@pytest.mark.asyncio
async def test_location_action_payload(client: AsyncClient):
    """Verify valid SET_LOCATION UI_ACTION and rejection of invalid coordinates."""
    guest_id = str(uuid.uuid4())
    headers = {"X-Guest-ID": guest_id}

    create_res = await client.post("/api/trips", headers=headers)
    trip_id = create_res.json()["trip_id"]

    # Valid location action
    loc_res = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers=headers,
        json={
            "message_type": "UI_ACTION",
            "payload": {
                "action": "SET_LOCATION",
                "latitude": 22.5726,
                "longitude": 88.3639,
                "label": "Kolkata",
            },
        },
    )
    assert loc_res.status_code == 200
    data = loc_res.json()
    assert data["trip"]["origin_latitude"] == 22.5726
    assert data["trip"]["origin_longitude"] == 88.3639
    assert data["trip"]["origin_text"] == "Kolkata"

    # Invalid latitude rejection (out of bounds)
    invalid_res = await client.post(
        f"/api/trips/{trip_id}/messages",
        headers=headers,
        json={
            "message_type": "UI_ACTION",
            "payload": {
                "action": "SET_LOCATION",
                "latitude": 150.0,
                "longitude": 88.3639,
            },
        },
    )
    assert invalid_res.status_code == 422


@pytest.mark.asyncio
async def test_get_trip_state_and_messages(client: AsyncClient):
    """Verify GET /api/trips/{trip_id} and GET /api/trips/{trip_id}/messages."""
    guest_id = str(uuid.uuid4())
    headers = {"X-Guest-ID": guest_id}

    create_res = await client.post("/api/trips", headers=headers)
    trip_id = create_res.json()["trip_id"]

    # Send message
    await client.post(
        f"/api/trips/{trip_id}/messages",
        headers=headers,
        json={"message_type": "TEXT", "content": "France"},
    )

    # Get Trip State
    get_res = await client.get(f"/api/trips/{trip_id}", headers=headers)
    assert get_res.status_code == 200
    state = get_res.json()
    assert state["trip"]["destination"] == "France"

    # Get Messages
    msgs_res = await client.get(f"/api/trips/{trip_id}/messages", headers=headers)
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()["messages"]
    assert len(msgs) == 3  # Initial Assistant + User "France" + Assistant response


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
