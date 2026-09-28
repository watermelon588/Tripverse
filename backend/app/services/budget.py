"""Deterministic, persistent trip budget ledger.

The itinerary creates coverage rows, never invented prices. All totals derive from
traveler-entered amounts in one trip currency; draft quotes remain reference text.
"""

import hashlib
import re
from collections import Counter
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import BudgetItem, BudgetPlan
from app.models.enums import MessageRole
from app.models.trip import ConversationMessage, ConversationSession, Trip
from app.schemas.budget import BudgetItemInput, BudgetItemResponse, BudgetResponse, BudgetSettingsUpdate

ZERO = Decimal("0.00")


def _key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _name(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _normalized(value: str) -> str:
    return _name(value).casefold()


async def _latest_payload(db: AsyncSession, trip_id: UUID, field: str) -> dict | None:
    result = await db.execute(
        select(ConversationMessage)
        .join(ConversationSession, ConversationMessage.session_id == ConversationSession.id)
        .where(ConversationSession.trip_id == trip_id, ConversationMessage.role == MessageRole.ASSISTANT)
        .order_by(ConversationMessage.created_at.desc(), ConversationMessage.id.desc())
    )
    for message in result.scalars():
        payload = message.payload or {}
        if payload.get("kind") == "ITINERARY_GRAPH" and isinstance(payload.get(field), dict):
            return payload[field]
    return None


async def latest_itinerary_payload(db: AsyncSession, trip_id: UUID) -> dict | None:
    """The newest itinerary message payload: graph, plus copilot or day_plan when present."""
    result = await db.execute(
        select(ConversationMessage)
        .join(ConversationSession, ConversationMessage.session_id == ConversationSession.id)
        .where(ConversationSession.trip_id == trip_id, ConversationMessage.role == MessageRole.ASSISTANT)
        .order_by(ConversationMessage.created_at.desc(), ConversationMessage.id.desc())
    )
    return next((message.payload for message in result.scalars()
                 if (message.payload or {}).get("kind") == "ITINERARY_GRAPH"
                 and isinstance(message.payload.get("graph"), dict)), None)


async def latest_itinerary_graph(db: AsyncSession, trip_id: UUID) -> dict | None:
    return await _latest_payload(db, trip_id, "graph")


async def latest_copilot_state(db: AsyncSession, trip_id: UUID) -> dict | None:
    """Build-with-agent state rides on the itinerary message it produced."""
    return await _latest_payload(db, trip_id, "copilot")


async def budget_target(db: AsyncSession, trip_id: UUID) -> float | None:
    plan = await db.get(BudgetPlan, trip_id)
    return float(plan.target_amount) if plan and plan.target_amount is not None else None


async def apply_agent_budget(db: AsyncSession, trip: Trip, amount: float | None, currency: str | None) -> None:
    """Mirror a budget from the trip brief or the agent into the ledger, never converting entered amounts."""
    if currency and currency != trip.currency:
        result = await db.execute(select(BudgetItem.id).where(
            BudgetItem.trip_id == trip.id, BudgetItem.unit_amount.is_not(None)).limit(1))
        if result.first():
            return
        trip.currency = currency
    if amount is not None:
        plan = await _ensure_plan(db, trip.id)
        plan.target_amount = Decimal(str(round(amount, 2)))


def _days(node: dict) -> tuple[int, int] | None:
    try:
        start, end = int(node.get("day_start")), int(node.get("day_end") or node.get("day_start"))
    except (TypeError, ValueError):
        return None
    return (start, end) if 0 < start <= end else None


def _desired_rows(graph: dict, trip_days: int | None = None) -> dict[str, dict]:
    nodes = [node for node in graph.get("nodes", []) if isinstance(node, dict) and _name(node.get("name"))]
    last_day = max((span[1] for node in nodes if (span := _days(node))), default=0)
    stops = [node for node in nodes if node.get("kind") != "origin"]
    # A single-stop draft without day ranges still covers the whole trip.
    whole_trip = (1, trip_days) if trip_days and len(stops) == 1 and not _days(stops[0]) else None
    last_day = last_day or (trip_days if whole_trip else 0)
    by_id = {str(node.get("id")): node for node in nodes}
    node_occurrences: Counter[str] = Counter()
    node_identity: dict[str, str] = {}
    desired: dict[str, dict] = {}
    first_place = next((str(node.get("id")) for node in nodes if node.get("kind") != "origin"
                        and not re.search(r"\b(station|airport|terminal|bus stand|metro stop|railway)\b", _name(node["name"]), re.I)), None)
    for node in nodes:
        name = _name(node["name"])
        normalized = _normalized(name)
        node_occurrences[normalized] += 1
        identity = f"stop:{normalized}:{node_occurrences[normalized]}"
        node_identity[str(node.get("id"))] = identity
        if node.get("kind") == "origin":
            continue
        if re.search(r"\b(station|airport|terminal|bus stand|metro stop|railway)\b", name, re.I):
            continue  # Transfers have travel legs, not a second hotel/meal budget.
        try:
            multi_day = int(node.get("day_end") or 0) > int(node.get("day_start") or 0)
        except (TypeError, ValueError):
            multi_day = False
        base = str(node.get("id")) == first_place or multi_day or bool(re.search(
            r"\b(overnight|hotel|check.in|stay in)\b", _name(node.get("evidence")), re.I))
        span = _days(node) or (whole_trip if node is stops[0] else None)
        days = span[1] - span[0] + 1 if span else 1
        # The final base is left on the last day, so it needs one night fewer.
        nights = max(1, days - 1 if span and span[1] == last_day else days)
        rows = [("activities", f"Activities in {name}", 1), ("travel", f"Local travel in {name}", days)]
        if base:
            rows = [("stay", f"Stay in {name}", nights), ("food", f"Food in {name}", days), *rows]
        for category, label, quantity in rows:
            desired[_key(f"{identity}:{category}")] = {
                "scope": "stop", "category": category, "label": label,
                "place_name": name, "quote_text": None, "quantity": Decimal(quantity),
            }
    edge_occurrences: Counter[str] = Counter()
    for edge in graph.get("edges", []):
        if not isinstance(edge, dict):
            continue
        from_node, to_node = by_id.get(str(edge.get("source"))), by_id.get(str(edge.get("target")))
        if not from_node or not to_node:
            continue
        from_name, to_name = _name(from_node["name"]), _name(to_node["name"])
        identity = f"leg:{node_identity[str(edge['source'])]}:{node_identity[str(edge['target'])]}"
        edge_occurrences[identity] += 1
        quote = _name(edge.get("cost"))[:500] or None
        desired[_key(f"{identity}:{edge_occurrences[identity]}")] = {
            "scope": "leg", "category": "travel", "label": f"Travel {from_name} → {to_name}",
            "place_name": f"{from_name} → {to_name}", "quote_text": quote, "quantity": Decimal(1),
        }
    return desired


async def sync_budget_for_graph(db: AsyncSession, trip_id: UUID, graph: dict) -> None:
    """Reconcile itinerary rows. User amounts survive matching routes; removed rows stay for review."""
    trip = await db.get(Trip, trip_id)
    desired = _desired_rows(graph, trip.duration_days if trip else None)
    result = await db.execute(select(BudgetItem).where(BudgetItem.trip_id == trip_id))
    existing = {item.source_key: item for item in result.scalars() if item.source_key}
    for source_key, values in desired.items():
        item = existing.get(source_key)
        if item:
            item.is_current = True
            item.quote_text = values["quote_text"]
            if item.unit_amount is None:  # Priced rows keep the traveler's own quantity.
                item.quantity = values["quantity"]
        else:
            db.add(BudgetItem(trip_id=trip_id, source_key=source_key, **values))
    for source_key, item in existing.items():
        if source_key not in desired:
            if item.unit_amount is None:
                await db.delete(item)
            else:
                item.is_current = False
    await db.flush()


async def _ensure_plan(db: AsyncSession, trip_id: UUID) -> BudgetPlan:
    plan = await db.get(BudgetPlan, trip_id)
    if not plan:
        plan = BudgetPlan(trip_id=trip_id)
        db.add(plan)
        await db.flush()
    return plan


async def budget_response(db: AsyncSession, trip: Trip, *, sync: bool = True,
                          payload: dict | None = None) -> BudgetResponse:
    """`payload`: the latest itinerary payload when the caller already has it. Each database
    round trip is ~0.5 s against a remote Postgres, so the message scan runs once, not three times."""
    plan = await _ensure_plan(db, trip.id)
    await db.flush()  # Sessions disable autoflush; include just-saved edits in the returned totals.
    if sync:
        payload = payload if payload is not None else (await latest_itinerary_payload(db, trip.id) or {})
        if payload.get("graph"):
            await sync_budget_for_graph(db, trip.id, payload["graph"])
    result = await db.execute(select(BudgetItem).where(BudgetItem.trip_id == trip.id)
                              .order_by(BudgetItem.scope, BudgetItem.place_name, BudgetItem.category, BudgetItem.label))
    items = list(result.scalars())
    if sync:
        # Keep the ledger's suggestions equal to the build-with-agent plan, turn by turn.
        copilot = payload.get("copilot")
        if copilot and copilot.get("currency") == trip.currency:
            current = [item for item in items if item.is_current]
            for item in current:
                if item.estimate_note == AGENT_NOTE:
                    item.estimate_amount = item.estimate_note = None
            by_id = {item.id: item for item in current}
            for item_id, (amount, note) in _copilot_estimates(copilot, current).items():
                if by_id[item_id].estimate_amount is None:
                    by_id[item_id].estimate_amount, by_id[item_id].estimate_note = amount, note
    category_totals: dict[str, Decimal] = {}
    place_totals: dict[str, Decimal] = {}
    priced_total = ZERO
    estimated_extra = ZERO
    unpriced_count = 0
    unestimated_count = 0
    review_count = 0
    for item in items:
        if not item.is_current:
            review_count += 1
            continue
        if not item.is_included:
            continue
        if item.unit_amount is None:
            unpriced_count += 1
            if item.estimate_amount is None:
                unestimated_count += 1
            else:
                estimated_extra += (item.quantity * item.estimate_amount).quantize(Decimal("0.01"))
            continue
        total = (item.quantity * item.unit_amount).quantize(Decimal("0.01"))
        priced_total += total
        category_totals[item.category] = category_totals.get(item.category, ZERO) + total
        place = item.place_name or "General trip costs"
        place_totals[place] = place_totals.get(place, ZERO) + total
    return BudgetResponse(
        trip_id=trip.id, currency=trip.currency, target_amount=plan.target_amount,
        priced_total=priced_total,
        remaining=plan.target_amount - priced_total if plan.target_amount is not None else None,
        unpriced_count=unpriced_count, review_count=review_count,
        projected_total=priced_total + estimated_extra, unestimated_count=unestimated_count,
        category_totals=category_totals, place_totals=place_totals,
        items=[BudgetItemResponse.model_validate(item) for item in items],
    )


async def update_budget_settings(db: AsyncSession, trip: Trip, request: BudgetSettingsUpdate) -> BudgetResponse:
    plan = await _ensure_plan(db, trip.id)
    if request.currency != trip.currency:
        result = await db.execute(select(BudgetItem.id).where(
            BudgetItem.trip_id == trip.id, BudgetItem.unit_amount.is_not(None)).limit(1))
        if result.first():
            raise HTTPException(status_code=409, detail="Clear entered amounts before changing currency; amounts are never converted silently.")
        trip.currency = request.currency
    plan.target_amount = request.target_amount
    response = await budget_response(db, trip)
    await db.commit()
    return response


async def add_budget_item(db: AsyncSession, trip: Trip, request: BudgetItemInput) -> BudgetResponse:
    item = BudgetItem(trip_id=trip.id, scope="manual", source_key=None, **request.model_dump())
    db.add(item)
    response = await budget_response(db, trip)
    await db.commit()
    return response


async def update_budget_item(db: AsyncSession, trip: Trip, item_id: UUID, request: BudgetItemInput) -> BudgetResponse:
    item = await db.get(BudgetItem, item_id)
    if not item or item.trip_id != trip.id:
        raise HTTPException(status_code=404, detail="Budget item not found.")
    for field, value in request.model_dump().items():
        setattr(item, field, value)
    response = await budget_response(db, trip)
    await db.commit()
    return response


async def delete_budget_item(db: AsyncSession, trip: Trip, item_id: UUID) -> BudgetResponse:
    item = await db.get(BudgetItem, item_id)
    if not item or item.trip_id != trip.id:
        raise HTTPException(status_code=404, detail="Budget item not found.")
    if item.source_key:
        raise HTTPException(status_code=409, detail="Itinerary rows stay linked to the route. Exclude this row instead.")
    await db.delete(item)
    await db.flush()
    response = await budget_response(db, trip)
    await db.commit()
    return response


ESTIMATE_INSTRUCTION = """You estimate trip budget rows for TripVerse.
Return JSON only: {"estimates":[{"id":"row id","amount":1234,"note":"short basis"}]}
- amount is per unit, per person, in CURRENCY: per night for stay, per day for food and local travel,
  per stop for activities (entry fees and paid experiences), per journey for travel legs (economy fare for flights).
- Match the traveler's pace and interests; assume mid-range unless the preferences say otherwise.
- Prefer figures from EVIDENCE (traveler posts). The note names the basis in under 80 characters,
  e.g. "Reddit travelers: business hotels ~9,000/night"; write "Typical estimate" when not from evidence.
- Use null for a row you cannot reasonably estimate.
"""


AGENT_NOTE = "From your build-with-agent plan"


async def traveler_rates(db: AsyncSession, trip_id: UUID) -> dict[str, float]:
    """Stay/food amounts the traveler entered, for the agent to plan with."""
    result = await db.execute(select(BudgetItem.category, BudgetItem.unit_amount).where(
        BudgetItem.trip_id == trip_id, BudgetItem.scope == "stop", BudgetItem.is_current.is_(True),
        BudgetItem.unit_amount.is_not(None), BudgetItem.category.in_(("stay", "food"))))
    amounts: dict[str, list[float]] = {}
    for category, amount in result.all():
        amounts.setdefault(category, []).append(float(amount))
    # ponytail: one trip-wide average; per-base rates when multi-city budgets need them
    return {("stay_per_night" if category == "stay" else "food_per_day"): round(sum(values) / len(values), 2)
            for category, values in amounts.items()}


def _copilot_estimates(copilot: dict, items: list[BudgetItem]) -> dict[UUID, tuple[Decimal, str]]:
    """Reuse the build-with-agent plan's own numbers so the ledger and the agent agree."""
    from app.agents.trip_planner.copilot import engine

    rates, found = copilot.get("rates") or {}, {}
    for item in items:
        if item.scope != "stop":
            continue
        days = [day for day in copilot.get("days", []) if _normalized(day["base"]) == _normalized(item.place_name or "")]
        if not days:
            continue
        planned = [i for day in days for i in day["items"]]
        transfers = sum(engine.day_cost(copilot, day["items"]) - sum(i.get("est_cost") or 0 for i in day["items"])
                        for day in days) / len(days)
        amount = {"stay": rates.get("stay_per_night"), "food": rates.get("food_per_day"),
                  "activities": sum(i.get("est_cost") or 0 for i in planned) if planned else None,
                  "travel": transfers if engine.hop_cost(copilot) is not None else None}.get(item.category)
        if amount is not None:
            found[item.id] = (Decimal(str(amount)).quantize(Decimal("0.01")), AGENT_NOTE)
    return found


async def _research_estimates(trip: Trip, items: list[BudgetItem]) -> dict[UUID, tuple[Decimal, str]]:
    import json

    from app.agents.trip_planner.copilot.research import community_search
    from app.services.llm.service import llm_service, model_for

    try:
        evidence = await community_search(f"{trip.destination} trip cost per day hotel food transport budget")
    except Exception:
        evidence = []
    rows = {str(item.id): item for item in items}
    prompt = json.dumps({
        "CURRENCY": trip.currency, "DESTINATION": trip.destination, "ORIGIN": trip.origin_text,
        "DAYS": trip.duration_days, "PREFERENCES": trip.planning_preferences or {},
        "ROWS": [{"id": key, "category": item.category, "label": item.label, "quantity": float(item.quantity)}
                 for key, item in rows.items()],
        "EVIDENCE": [f"{r.get('title', '')} ({r.get('url', '')}): {str(r.get('content', ''))[:500]}"
                     for r in evidence[:6]],
    }, ensure_ascii=False)
    try:
        raw = await llm_service.generate(prompt=prompt, system_instruction=ESTIMATE_INSTRUCTION,
                                         temperature=0.2, **model_for("fast"))
        parsed = json.loads(re.search(r"\{[\s\S]*\}", raw or "").group(0))
    except Exception:
        return {}
    found = {}
    for entry in parsed.get("estimates") or [] if isinstance(parsed, dict) else []:
        if not isinstance(entry, dict) or str(entry.get("id")) not in rows or entry.get("amount") is None:
            continue
        try:
            amount = Decimal(str(entry["amount"])).quantize(Decimal("0.01"))
        except (ArithmeticError, ValueError, TypeError):
            continue
        if 0 <= amount < Decimal("1e10"):
            found[rows[str(entry["id"])].id] = (amount, _name(entry.get("note"))[:255] or "Typical estimate")
    return found


async def estimate_budget(db: AsyncSession, trip: Trip) -> BudgetResponse:
    """Suggest per-row amounts. Suggestions are shown, never counted until accepted."""
    await budget_response(db, trip)  # reconcile rows with the latest route first
    result = await db.execute(select(BudgetItem).where(
        BudgetItem.trip_id == trip.id, BudgetItem.is_current.is_(True), BudgetItem.scope != "manual"))
    items = list(result.scalars())
    copilot = await latest_copilot_state(db, trip.id)
    estimates = _copilot_estimates(copilot, items) if copilot and copilot.get("currency") == trip.currency else {}
    missing = [item for item in items if item.id not in estimates]
    if missing:
        estimates.update(await _research_estimates(trip, missing))
    if not estimates:
        raise HTTPException(status_code=503, detail="Couldn't estimate costs right now. Try again in a moment.")
    for item in items:
        if item.id in estimates:
            item.estimate_amount, item.estimate_note = estimates[item.id]
    response = await budget_response(db, trip, sync=False)
    await db.commit()
    return response


async def accept_budget_estimates(db: AsyncSession, trip: Trip) -> BudgetResponse:
    result = await db.execute(select(BudgetItem).where(
        BudgetItem.trip_id == trip.id, BudgetItem.is_current.is_(True),
        BudgetItem.unit_amount.is_(None), BudgetItem.estimate_amount.is_not(None)))
    for item in result.scalars():
        item.unit_amount = item.estimate_amount
    response = await budget_response(db, trip, sync=False)
    await db.commit()
    return response
