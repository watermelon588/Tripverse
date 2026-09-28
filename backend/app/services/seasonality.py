"""Season-aware tips per stop, from NASA POWER monthly climate and a few fixed rules.

No LLM calls. One climatology request per ~10 km cell, cached forever (averages over decades
don't change). Every figure is labelled "typical for <month>": this is climate, not a forecast.
Session 5's forecast can replace the figures inside the forecast window; the rules stay the same.
"""

import asyncio
import json
import logging
import re
import sqlite3
import time
from calendar import month_name

import httpx

from app.schemas.places import SeasonRequest, SeasonStop
from app.services.place_media import CACHE_DB_PATH, HEADERS

logger = logging.getLogger(__name__)
POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
# Monthly means. POWER's T2M_MAX / T2M_MIN are monthly extremes, not typical highs, so only T2M is used.
RAINY_MM, SHOWERY_MM = 5.0, 3.5  # mm of rain per day
FREEZING_C, COLD_C, HOT_C = 0.0, 5.0, 26.0
MILD_C = (12.0, 24.0)
# Leading word boundaries only, so plurals still match ("gardens") but "Nishiki" doesn't read as "hike".
OUTDOOR = re.compile(r"\b(?:garden|park|hik(?:e|ing)|trail|trek|beach|lake|mountain|waterfall|falls|island|bamboo|forest|valley|"
                     r"zoo|boat|cruise|river|viewpoint|outdoor|nature|coast|bay|safari|camp|fort|ruin|ghat)", re.I)
INDOOR = re.compile(r"\b(?:museum|gallery|onsen|hot spring|spa|market|mall|shopping|aquarium|theat(?:re|er)|cinema|arcade|"
                    r"indoor|food hall)", re.I)
ALPINE = re.compile(r"\b(?:alp|mountain|peak|ski|snow|glacier|highland|hill station)", re.I)
_db_lock = asyncio.Lock()


def _names(places: list[str]) -> str:
    shown = places[:3]
    text = shown[0] if len(shown) == 1 else f"{', '.join(shown[:-1])} and {shown[-1]}"
    return f"{text} and {len(places) - 3} more" if len(places) > 3 else text


def season_tips(month: int, temp_c: float, rain_mm_day: float, places: list[tuple[str, str]]) -> dict:
    """Badge and notes for one stop in one month. `places` are (name, text to match) pairs."""
    named = lambda pattern: [name for name, text in places if pattern.search(text)]  # noqa: E731
    outdoor, indoor, alpine = named(OUTDOOR), named(INDOOR), named(ALPINE)
    when = month_name[month]
    notes, badges = [], []

    if rain_mm_day >= RAINY_MM:
        badges.append(("warn", "Rainy season"))
        notes.append({"tone": "warn", "text": f"Rainy season: about {rain_mm_day:.0f} mm of rain a day in {when}. "
                                              "Pack an umbrella and keep one day flexible."})
        if outdoor:
            notes.append({"tone": "info", "text": f"Have an indoor backup for {_names(outdoor)}"
                                                  + (f", such as {_names(indoor)}." if indoor else ".")})
    elif rain_mm_day >= SHOWERY_MM:
        badges.append(("info", "Showers"))
        notes.append({"tone": "info", "text": f"Showery in {when}: pack an umbrella."})

    if temp_c < COLD_C:
        badges.append(("warn" if outdoor else "info", "Freezing" if temp_c < FREEZING_C else "Cold"))
        notes.append({"tone": "warn", "text": f"Low season for {_names(outdoor)}: around {temp_c:.0f} °C in {when}, "
                                              "so expect bare gardens and chilly trails."} if outdoor else
                     {"tone": "info", "text": f"Cold: around {temp_c:.0f} °C in {when}. Pack warm layers."})
        if indoor:
            notes.append({"tone": "good", "text": f"Good cold-weather picks: {_names(indoor)}."})
        if temp_c < FREEZING_C and alpine:
            notes.append({"tone": "warn", "text": f"Snow and ice likely around {_names(alpine)}. Check that trails and roads are open."})
    elif temp_c >= HOT_C:
        badges.append(("warn" if outdoor else "info", "Hot"))
        notes.append({"tone": "warn", "text": f"Hot: around {temp_c:.0f} °C in {when}. Do {_names(outdoor)} early or late in the day."}
                     if outdoor else {"tone": "info", "text": f"Hot: around {temp_c:.0f} °C in {when}. Carry water and rest at midday."})
    elif MILD_C[0] <= temp_c <= MILD_C[1] and rain_mm_day < SHOWERY_MM:
        badges.append(("good", "Pleasant"))
        if outdoor:
            notes.append({"tone": "good", "text": f"A good month for {_names(outdoor)}."})

    # Rain outranks temperature: it changes plans, temperature changes packing.
    order = {"Rainy season": 0, "Freezing": 1, "Hot": 2, "Cold": 3, "Showers": 4, "Pleasant": 5}
    tone, text = min(badges, key=lambda badge: order[badge[1]]) if badges else ("info", "Mild")
    return {"badge": {"tone": tone, "text": text}, "notes": notes}


def _connect() -> sqlite3.Connection:
    CACHE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(CACHE_DB_PATH, timeout=3)
    connection.execute("CREATE TABLE IF NOT EXISTS climate (key TEXT PRIMARY KEY, data TEXT NOT NULL, saved REAL NOT NULL)")
    return connection


def _cache(key: str, data: dict | None = None) -> dict | None:
    connection = _connect()
    try:
        with connection:
            if data is not None:
                connection.execute("INSERT OR REPLACE INTO climate VALUES (?, ?, ?)", (key, json.dumps(data), time.time()))
                return data
            row = connection.execute("SELECT data FROM climate WHERE key = ?", (key,)).fetchone()
    finally:
        connection.close()
    return json.loads(row[0]) if row else None


async def _climate(client: httpx.AsyncClient, cell: str) -> dict | None:
    """Monthly mean temperature and rain for a cell, as {"JAN": [temp_c, rain_mm_day], ...}."""
    async with _db_lock:
        cached = _cache(cell)
    if cached:
        return cached
    lat, lon = cell.split(",")
    try:
        response = await client.get(POWER_URL, params={
            "parameters": "T2M,PRECTOTCORR", "community": "RE", "latitude": lat, "longitude": lon, "format": "JSON"})
        response.raise_for_status()
        values = response.json()["properties"]["parameter"]
        data = {month: [values["T2M"][month], values["PRECTOTCORR"][month]] for month in MONTHS}
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        logger.info("Climate unavailable for %s: %s", cell, exc)
        return None  # not cached: retried next time
    if any(value is None or value <= -999 for pair in data.values() for value in pair):
        return None  # POWER's fill value for missing data
    async with _db_lock:
        return _cache(cell, data)


async def get_season(request: SeasonRequest) -> dict:
    cell = lambda stop: f"{stop.lat:.1f},{stop.lon:.1f}"  # noqa: E731
    cells = sorted({cell(stop) for stop in request.stops})
    limit = asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=25.0, headers=HEADERS) as client:
        async def one(key: str):
            async with limit:
                return key, await _climate(client, key)
        climates = dict(await asyncio.gather(*(one(key) for key in cells)))

    def tips(stop: SeasonStop) -> dict | None:
        climate = climates.get(cell(stop))
        if not climate:
            return None
        temp_c, rain = climate[MONTHS[stop.month - 1]]
        places = [(place.name, f"{place.name} {place.category or ''}") for place in stop.places]
        return {"id": stop.id, "month": stop.month, "label": f"Typical for {month_name[stop.month]}",
                "temp_c": round(temp_c, 1), "rain_mm_day": round(rain, 1), **season_tips(stop.month, temp_c, rain, places)}

    return {"source": "NASA POWER climatology", "stops": [item for stop in request.stops if (item := tips(stop))]}
