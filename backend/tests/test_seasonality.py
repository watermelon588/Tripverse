from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

import app.services.seasonality as seasonality
from app.schemas.places import SeasonRequest

KYOTO = [("Arashiyama Bamboo Grove", "Arashiyama Bamboo Grove nature"), ("Nishiki Market", "Nishiki Market market"),
         ("Kinkaku-ji", "Kinkaku-ji temple garden")]
# NASA POWER monthly means for Tokyo (T2M °C, PRECTOTCORR mm/day), trimmed from a live reply.
TOKYO_T2M = [4.7, 5.4, 8.7, 13.5, 17.9, 21.8, 25.5, 26.9, 23.3, 17.6, 12.2, 7.3]
TOKYO_RAIN = [2.6, 3.0, 4.2, 4.5, 4.8, 6.2, 4.9, 4.3, 6.5, 6.0, 3.4, 2.7]


def power_reply(t2m=TOKYO_T2M, rain=TOKYO_RAIN):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"properties": {"parameter": {
        "T2M": dict(zip(seasonality.MONTHS, t2m)), "PRECTOTCORR": dict(zip(seasonality.MONTHS, rain))}}}
    return response


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(seasonality, "CACHE_DB_PATH", tmp_path / "cache.sqlite3")


def texts(tips):
    return " | ".join(note["text"] for note in tips["notes"])


def test_june_tokyo_is_rainy_season_with_an_umbrella_and_indoor_backup():
    tips = seasonality.season_tips(6, 21.8, 6.2, [("Shinjuku Gyoen", "Shinjuku Gyoen park"), ("teamLab", "teamLab museum")])
    assert tips["badge"] == {"tone": "warn", "text": "Rainy season"}
    assert "Pack an umbrella" in texts(tips) and "indoor backup for Shinjuku Gyoen, such as teamLab" in texts(tips)


def test_january_kyoto_flags_outdoor_places_and_suggests_indoor_ones():
    tips = seasonality.season_tips(1, 2.2, 3.1, KYOTO)
    assert tips["badge"] == {"tone": "warn", "text": "Cold"}
    low = next(note for note in tips["notes"] if note["tone"] == "warn")["text"]
    assert "Arashiyama Bamboo Grove and Kinkaku-ji" in low and "Nishiki" not in low
    # Keywords match at word starts only, so a steakhouse called Sparks isn't a park.
    assert not seasonality.OUTDOOR.search("Sparks Steak House restaurant")
    assert any(note["tone"] == "good" and "Nishiki Market" in note["text"] for note in tips["notes"])


def test_heat_snow_and_pleasant_months():
    hot = seasonality.season_tips(5, 34.2, 0.6, [("Amber Fort", "Amber Fort history fort")])
    assert hot["badge"] == {"tone": "warn", "text": "Hot"} and "Do Amber Fort early or late" in texts(hot)
    alpine = seasonality.season_tips(1, -10, 2.0, [("Gornergrat", "Gornergrat mountain viewpoint")])
    assert alpine["badge"]["text"] == "Freezing" and "Snow and ice likely around Gornergrat" in texts(alpine)
    spring = seasonality.season_tips(5, 17.9, 2.0, [("Ueno Park", "Ueno Park park")])
    assert spring["badge"] == {"tone": "good", "text": "Pleasant"} and "good month for Ueno Park" in texts(spring)
    assert seasonality.season_tips(4, 13.5, 4.5, [])["badge"]["text"] == "Showers"


@pytest.mark.asyncio
async def test_climate_is_fetched_once_per_cell_labelled_and_cached():
    request = SeasonRequest(stops=[
        {"id": "a", "lat": 35.68, "lon": 139.69, "month": 6, "places": [{"name": "Shinjuku Gyoen", "category": "park"}]},
        {"id": "b", "lat": 35.66, "lon": 139.70, "month": 1},  # same ~10 km cell
    ])
    get = AsyncMock(return_value=power_reply())
    with patch("httpx.AsyncClient.get", get):
        result = await seasonality.get_season(request)
    assert get.await_count == 1 and get.await_args.kwargs["params"]["parameters"] == "T2M,PRECTOTCORR"
    june, january = result["stops"]
    assert june["label"] == "Typical for June" and june["rain_mm_day"] == 6.2 and june["badge"]["text"] == "Rainy season"
    assert january["badge"]["text"] == "Cold"
    with patch("httpx.AsyncClient.get", AsyncMock(side_effect=AssertionError("network used"))):
        assert len((await seasonality.get_season(request))["stops"]) == 2


@pytest.mark.asyncio
async def test_failures_and_missing_data_are_not_cached_or_shown():
    request = SeasonRequest(stops=[{"id": "a", "lat": 10, "lon": 10, "month": 3}])
    with patch("httpx.AsyncClient.get", AsyncMock(side_effect=httpx.ConnectTimeout("down"))):
        assert (await seasonality.get_season(request))["stops"] == []
    with patch("httpx.AsyncClient.get", AsyncMock(return_value=power_reply(t2m=[-999] * 12))):
        assert (await seasonality.get_season(request))["stops"] == []
    with patch("httpx.AsyncClient.get", AsyncMock(return_value=power_reply())):
        assert len((await seasonality.get_season(request))["stops"]) == 1


@pytest.mark.asyncio
async def test_endpoint_refuses_anonymous_but_serves_guests(client):
    body = {"stops": [{"id": "a", "lat": 35.68, "lon": 139.69, "month": 6}]}
    assert (await client.post("/api/places/season", json=body)).status_code == 401
    guest = {"X-Guest-ID": "3f1c2a9e-8b7d-4c6e-9a1f-2b3c4d5e6f70"}
    with patch("app.api.routes.places.get_season", AsyncMock(return_value={"source": "x", "stops": []})) as service:
        assert (await client.post("/api/places/season", json=body, headers=guest)).status_code == 200
    assert service.await_count == 1
    body["stops"][0]["month"] = 13
    assert (await client.post("/api/places/season", json=body, headers=guest)).status_code == 422
