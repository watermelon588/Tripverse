"""Build the normalized trip document from whichever planner produced the trip."""

from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.trip_planner.nodes.extract_itinerary_node import normalize_day_plan
from app.models.trip import Trip
from app.schemas.trip_document import DocBudget, DocDay, DocItem, DocLeg, DocTravelers, TripDocument
from app.services.budget import budget_response, latest_itinerary_payload
from app.services.enrichment import get_enrichment

# Graph nearby-place categories → day-plan categories (legacy one-shot trips).
_GRAPH_CATEGORY = {"attraction": "sight", "restaurant": "food", "neighborhood": "sight"}


def _start_date(value) -> date | None:
    try:
        return date.fromisoformat(value) if isinstance(value, str) else None
    except ValueError:
        return None


def _agent_days(copilot: dict) -> list[DocDay]:
    totals = {entry["day"]: entry for entry in (copilot.get("summary") or {}).get("by_day", [])}
    return [DocDay(
        day=day["day"], base=day["base"],
        est_cost=totals.get(day["day"], {}).get("cost"), hours=totals.get(day["day"], {}).get("hours"),
        items=[DocItem(name=item["name"], category=item.get("category") or "other", area=item.get("area"),
                       est_cost=item.get("est_cost"), duration_hours=item.get("duration_hours"),
                       tip=item.get("why") or None, source_url=item.get("source")) for item in day["items"]],
    ) for day in copilot.get("days", [])]


def _legacy_days(graph: dict, duration_days: int, destination: str) -> list[dict]:
    """Trips planned before day_plan existed: bases from the graph, each stop's places on its first day."""
    days = normalize_day_plan(None, duration_days, graph, destination)
    for node in graph.get("nodes", []):
        start = node.get("day_start")
        if node.get("kind") == "stop" and type(start) is int and 1 <= start <= duration_days:
            days[start - 1]["items"] += [{"name": place["name"], "time_of_day": None,
                                          "category": _GRAPH_CATEGORY.get(place.get("category"), "other")}
                                         for place in node.get("nearby_places", [])]
    return days


async def build_trip_document(db: AsyncSession, trip: Trip) -> TripDocument:
    payload = await latest_itinerary_payload(db, trip.id) or {}
    budget = await budget_response(db, trip, payload=payload)  # also syncs ledger rows with the latest route
    prefs = trip.planning_preferences or {}
    graph, copilot = payload.get("graph"), payload.get("copilot")
    duration = trip.duration_days or 0
    start = _start_date(prefs.get("start_date"))

    if copilot:
        mode, days = "agent", _agent_days(copilot)
    elif graph:
        raw = payload.get("day_plan") or _legacy_days(graph, duration, trip.destination or "Trip")
        mode, days = "one_shot", [DocDay(day=entry["day"], base=entry["base"],
                                         items=[DocItem(**item) for item in entry["items"]]) for entry in raw]
    else:
        mode, days = "none", []
    for day in days:
        day.date = start + timedelta(days=day.day - 1) if start else None

    # Trips without a plan yet still get conditions for the destination across their dates.
    conditions_days = [(day.day, day.base, [(item.name, " ".join(filter(None, (item.name, item.category, item.area))))
                                            for item in day.items]) for day in days] \
        or [(number, trip.destination, []) for number in range(1, duration + 1) if trip.destination]
    enrichment = await get_enrichment(trip.destination, start, conditions_days, budget.currency,
                                      home=prefs.get("home_currency"))

    names = {node.get("id"): node.get("name") for node in (graph or {}).get("nodes", [])}
    legs = [DocLeg(source=names[edge["source"]], target=names[edge["target"]],
                   **{key: edge.get(key) for key in ("mode", "duration", "distance", "cost")})
            for edge in (graph or {}).get("edges", []) if edge.get("source") in names and edge.get("target") in names]

    return TripDocument(
        trip_id=trip.id, mode=mode, status=copilot.get("status") if copilot else None,
        destination=trip.destination, origin=trip.origin_text, duration_days=trip.duration_days,
        start_date=start, end_date=start + timedelta(days=duration - 1) if start and duration else None,
        travelers=DocTravelers(adults=prefs.get("adults") or 1, children=prefs.get("children") or 0),
        comfort=prefs.get("comfort") or "mid_range", travel_mode=prefs.get("travel_mode") or "transit",
        pace=prefs.get("pace") or "balanced", interests=prefs.get("interests") or [],
        avoid=prefs.get("avoid") or [], must_see=trip.places_to_visit or [], guide=prefs.get("guide"),
        days=days, legs=legs, graph=graph, enrichment=enrichment,
        budget=DocBudget(
            currency=budget.currency,
            target=float(budget.target_amount) if budget.target_amount is not None else None,
            planned=(copilot.get("summary") or {}).get("committed") if copilot else None,
            entered=float(budget.priced_total), projected=float(budget.projected_total),
        ),
    )
