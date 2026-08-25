import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac



@pytest.mark.asyncio
async def test_create_trip(client: AsyncClient):
    """Verify POST /api/trips creates trip, session, and initial assistant message."""
    response = await client.post("/api/trips")
    assert response.status_code == 201
    data = response.json()

    assert "trip_id" in data
    assert "session_id" in data
    assert "assistant_message" in data
    assert data["assistant_message"]["role"] == "ASSISTANT"
    assert data["assistant_message"]["content"] == "Welcome Rohit. Where do you want to head out to?"


@pytest.mark.asyncio
async def test_single_field_onboarding_flow(client: AsyncClient):
    """Verify step-by-step onboarding (destination -> duration -> origin)."""
    # 1. Create trip
    create_res = await client.post("/api/trips")
    trip_id = create_res.json()["trip_id"]

    # 2. Send Destination "Japan"
    msg1_res = await client.post(
        f"/api/trips/{trip_id}/messages",
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
    create_res = await client.post("/api/trips")
    trip_id = create_res.json()["trip_id"]

    msg_res = await client.post(
        f"/api/trips/{trip_id}/messages",
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
    create_res = await client.post("/api/trips")
    trip_id = create_res.json()["trip_id"]

    # Valid location action
    loc_res = await client.post(
        f"/api/trips/{trip_id}/messages",
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
    create_res = await client.post("/api/trips")
    trip_id = create_res.json()["trip_id"]

    # Send message
    await client.post(
        f"/api/trips/{trip_id}/messages",
        json={"message_type": "TEXT", "content": "France"},
    )

    # Get Trip State
    get_res = await client.get(f"/api/trips/{trip_id}")
    assert get_res.status_code == 200
    state = get_res.json()
    assert state["trip"]["destination"] == "France"

    # Get Messages
    msgs_res = await client.get(f"/api/trips/{trip_id}/messages")
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()["messages"]
    assert len(msgs) == 3  # Initial Assistant + User "France" + Assistant response


@pytest.mark.asyncio
async def test_missing_trip_returns_404(client: AsyncClient):
    """Verify 404 for non-existent trip ID."""
    random_uuid = str(uuid.uuid4())
    res = await client.get(f"/api/trips/{random_uuid}")
    assert res.status_code == 404
