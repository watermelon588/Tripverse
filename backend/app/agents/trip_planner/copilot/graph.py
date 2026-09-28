"""Build-with-agent subgraph: plan the trip one day at a time with the traveler.

    START ─┬─ init ───────────────────────────┐
           └─ interpret → apply ─┬─ research ─┤
                                 └────────────┴→ recommend → respond → render → END

interpret (fast model) turns the message into ops; apply/recommend/render are
deterministic (engine.py); research pulls traveler posts; respond (main model)
only puts the computed facts into words.
"""

import copy
import json
import logging
import re
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents.trip_planner.copilot import engine
from app.agents.trip_planner.copilot.research import initial_queries, research
from app.agents.trip_planner.nodes.extract_itinerary_node import build_itinerary_graph
from app.services.llm.service import llm_service, model_for

logger = logging.getLogger(__name__)

START_ACTION = "START_BUILD_WITH_AGENT"
OPS_ACTION = "COPILOT_OPS"


class CopilotState(TypedDict, total=False):
    copilot: dict
    user_message: str
    ui_action: dict | None
    destination: str
    duration_days: int
    origin: str | None
    currency: str | None
    budget_target: float | None
    planning_preferences: dict
    places_to_visit: list[str]
    user_name: str | None

    ops: list
    events: list[str]
    blocked: list[dict]
    queries: list[str]
    plan_bases: bool
    focus_day: int | None
    nav_only: bool
    defer_reply: bool
    facts: dict
    assistant_response: str
    itinerary_graph: dict


INTERPRET_INSTRUCTION = """You convert a traveler's message into edit operations for a day-by-day itinerary you are building together.
Return JSON only: {"ops":[...]}. Use {"ops":[]} when the message is only a question or chat.
Operations:
{"op":"add","name":"place","day":2,"force":false,"est_cost":null,"duration_hours":null,"area":null,"category":null,"tags":[]}
   force=true only when they insist after a warning ("add it anyway"). For places not in POOL give your best
   per-person est_cost in CURRENCY, duration_hours, area, category, tags.
{"op":"remove","name":"...","reject":true}      reject=true when they never want it suggested again
{"op":"move","name":"...","day":3}
{"op":"set_budget","amount":12000,"currency":"JPY"}
{"op":"set_cost","name":"place|stay_per_night|food_per_day|walk|transit|taxi|drive","amount":1500}
{"op":"pref","kind":"must|avoid|like|dislike","value":"short term"}
   must/avoid are hard rules ("must", "never", "can't", allergies, mobility); like/dislike are soft leanings ("prefer", "not a fan").
{"op":"unpref","kind":"must|avoid|like|dislike","value":"..."}
{"op":"set_mode","value":"walk|transit|taxi|drive"}
{"op":"set_pace","value":"relaxed|balanced|packed"}
{"op":"set_vibe","value":["chill","foodie"]}
{"op":"set_base","days":[3,4],"base":"Kyoto"}
{"op":"next_day"}  {"op":"goto_day","day":4}
{"op":"research","query":"late-night ramen near Shinjuku"}   when they want ideas POOL cannot answer
{"op":"finish"}
"The 2nd one" refers to LAST SUGGESTIONS. "day" defaults to CURRENT DAY. Use exact names from POOL or PLAN.
Only "add" a real, specifically named place (from POOL, PLAN, LAST SUGGESTIONS, or named by the traveler).
A vague wish ("in the mood for good food and a quiet garden") is never an add: record it as {"op":"pref","kind":"like"}
and add {"op":"research","query":"<destination/base> <wish> recommendations"}.
"""

RESPOND_INSTRUCTION = """You are TripVerse, a friendly, travel-savvy planner chatting with the traveler while you build
their trip together, one day at a time. Write like a person messaging a friend: warm, natural and short
(usually 2-5 sentences, at most ~120 words). Plain Markdown: no headings and no tables; a short bullet list
only when offering 2-3 options.

FACTS come from the planner and are your only source of truth:
- Name only places that appear in FACTS. Use only numbers from FACTS, with the currency and "~" (estimates).
- React to what the traveler just said or did first, in their terms ("Done, Kagurazaka is on day 1").
  If they asked a question, answer it before anything else.
- If something was blocked, say why in plain words (it would go over budget by ~N, the day is already full,
  it clashes with their no-X rule, they turned it down before) and offer its alternatives or other days by name.
- Mention a money_moves entry only when it saves something meaningful, as a friendly tip.
- The traveler can already see hours and totals in the day panel. Only bring up the budget when it changed a
  lot, is over, or they asked. If budget.baseline (stay + food) alone exceeds the budget, say so kindly and
  offer the fixes: raise the budget, or tell you their real hotel or food costs.
- Offer up to 3 of the day's suggestions, each with a few words from its "why". Credit travelers on
  Reddit/Quora/TripAdvisor only when source_url is set. If suggestions is empty, don't invent places: ask what
  they're in the mood for.
- First turn (no events and nothing planned yet): say in one line how this works (you'll suggest places for each
  day; they can tap a suggestion or just tell you what they like), then open day 1.
- If status is "complete": a brief wrap-up, one line per day plus the trip total, then invite changes.
- End with one easy question. Never mention tools, data, JSON, the planner or other internal systems.
"""


def _json(text: str) -> dict:
    match = re.search(r"\{[\s\S]*\}", text or "")
    try:
        parsed = json.loads(match.group(0)) if match else {}
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def init(state: CopilotState) -> dict:
    copilot = engine.new_copilot(
        destination=state["destination"], duration_days=state["duration_days"],
        currency=state.get("currency"), preferences=state.get("planning_preferences"),
        places=state.get("places_to_visit"), budget_target=state.get("budget_target"),
        overrides=state.get("ui_action"),
    )
    return {"copilot": copilot, "events": [], "blocked": [], "plan_bases": True,
            "queries": initial_queries(copilot)}


async def interpret(state: CopilotState) -> dict:
    action = state.get("ui_action") or {}
    if action.get("action") == OPS_ACTION:
        return {"ops": action.get("ops") or []}
    copilot = state["copilot"]
    prompt = "\n".join([
        f"CURRENT DAY: {copilot['current_day']} of {len(copilot['days'])}",
        f"CURRENCY: {copilot['currency']}",
        "PLAN: " + json.dumps([{"day": d["day"], "base": d["base"], "items": [i["name"] for i in d["items"]]}
                               for d in copilot["days"]], ensure_ascii=False),
        "LAST SUGGESTIONS: " + json.dumps(copilot["last_suggestions"], ensure_ascii=False),
        "LAST WARNINGS: " + json.dumps(copilot.get("last_blocked", []), ensure_ascii=False),
        "POOL: " + json.dumps([i["name"] for i in copilot["pool"][:40]], ensure_ascii=False),
        "PROFILE: " + json.dumps(copilot["profile"], ensure_ascii=False),
        f'TRAVELER MESSAGE: "{state.get("user_message") or ""}"',
    ])
    try:
        parsed = _json(await llm_service.generate(prompt=prompt, system_instruction=INTERPRET_INSTRUCTION,
                                                  temperature=0.0, **model_for("fast")))
    except Exception as exc:
        logger.warning("Copilot interpret failed: %s", exc)
        parsed = {}
    return {"ops": parsed.get("ops") if isinstance(parsed.get("ops"), list) else []}


def apply(state: CopilotState) -> dict:
    copilot = state["copilot"]
    ops = state.get("ops") or []
    events, blocked, queries = engine.apply_ops(copilot, ops)
    # Switching days only changes focus: no research, and respond replays that day's held reply.
    nav_only = bool(ops) and all(isinstance(op, dict) and op.get("op") in ("goto_day", "next_day") for op in ops)
    day = engine.day_of(copilot, copilot["current_day"])
    if not nav_only and copilot["status"] == "building" and len(engine.rank(copilot, day["day"])) < 2:
        likes = " ".join((copilot["profile"]["soft"]["likes"] + copilot["profile"]["vibe"])[:2])
        queries.append(f"{day['base']} {likes} recommendations local tips".replace("  ", " "))
    return {"copilot": copilot, "events": events, "blocked": blocked, "queries": queries,
            "plan_bases": False, "nav_only": nav_only}


async def research_node(state: CopilotState) -> dict:
    copilot = state["copilot"]
    await research(copilot, state.get("queries") or [], plan_bases=bool(state.get("plan_bases")))
    return {"copilot": copilot}


def _brief(item: dict) -> dict:
    return {"name": item["name"], "area": item.get("area"), "category": item["category"],
            "est_cost": item["est_cost"], "duration_hours": item["duration_hours"],
            "why": item.get("why"), "source_url": item.get("source"), "cost_basis": item["basis"]}


def recommend(state: CopilotState) -> dict:
    copilot = state["copilot"]
    day_no = copilot["current_day"]
    day = engine.day_of(copilot, day_no)
    blocked = [engine.alternatives_for(copilot, b) for b in state.get("blocked") or []]
    suggestions = engine.rank(copilot, day_no, 3)
    status = engine.budget_status(copilot)
    copilot["last_suggestions"] = [s["name"] for s in suggestions]
    copilot["last_blocked"] = [{"name": b["item"]["name"], "day": b["day"]} for b in blocked]
    copilot["summary"] = status  # read-only snapshot for the client; recomputed every turn
    # Every day keeps its own ranked options so the client can switch days without a round trip.
    for other in copilot["days"]:
        other["suggestions"] = [s["name"] for s in engine.rank(copilot, other["day"], 3)]
    today = next(d for d in status["by_day"] if d["day"] == day_no)
    return {"copilot": copilot, "facts": {
        "user_message": state.get("user_message") or "",
        "status": copilot["status"],
        "total_days": len(copilot["days"]),
        "current_day": {**today, "items": [_brief(i) for i in day["items"]]},
        "events": state.get("events") or [],
        "blocked": [{"name": b["item"]["name"], "day": b["day"], "reasons": b["reasons"],
                     "cost": b["item"]["est_cost"], "alternatives": [_brief(a) for a in b["alternatives"]],
                     "fits_on_days": b["fits_on_days"]} for b in blocked],
        "suggestions": [_brief(s) for s in suggestions],
        "money_moves": engine.move_suggestions(copilot),
        "budget": {k: v for k, v in status.items() if k != "by_day"},
        "travel_mode": copilot["profile"]["travel_mode"],
        "preferences": copilot["profile"],
        "days_overview": [{"day": d["day"], "base": d["base"], "cost": d["cost"],
                           "items": [i["name"] for i in engine.day_of(copilot, d["day"])["items"]]}
                          for d in status["by_day"]],
    }}


def _fallback_reply(facts: dict) -> str:
    """Plain reply built from the same facts when the model is unavailable."""
    budget, day = facts["budget"], facts["current_day"]
    lines = [f"- {event}" for event in facts["events"]]
    for b in facts["blocked"]:
        why = ", ".join(r["code"].replace("_", " ") for r in b["reasons"])
        options = ", ".join(a["name"] for a in b["alternatives"]) or "nothing cheaper yet"
        lines.append(f"- Couldn't add **{b['name']}** ({why}). Alternatives: {options}.")
    for move in facts["money_moves"][:1]:
        lines.append(f"- Tip: move **{move['name']}** from day {move['from_day']} to day {move['to_day']} "
                     f"to save ~{move['saves']:g} {budget['currency']} and {move['saves_minutes']} min.")
    planned = ", ".join(i["name"] for i in day["items"]) or "nothing yet"
    lines.append(f"\n**Day {day['day']} · {day['base']}** — {planned} ({day['hours']}/{day['capacity_hours']} h).")
    lines += [f"{n}. **{s['name']}**" + (f" (~{s['est_cost']:g} {budget['currency']})" if s["est_cost"] is not None else "")
              + (f" — {s['why']}" if s["why"] else "") for n, s in enumerate(facts["suggestions"], 1)]
    if budget["budget"] is not None:
        lines.append(f"\nBudget: ~{budget['committed']:g} of {budget['budget']:g} {budget['currency']} "
                     f"(~{budget['remaining']:g} left).")
    lines.append("\nWhich one should I add, or shall we move to the next day?")
    return "\n".join(lines).strip()


def reply_prompt(facts: dict) -> str:
    return "FACTS:\n" + json.dumps(facts, ensure_ascii=False, default=str)


def hold_reply(copilot: dict, text: str) -> str:
    """Keep the reply on its day so switching back replays it without a model call."""
    engine.day_of(copilot, copilot["current_day"])["reply"] = text
    return text


async def respond(state: CopilotState) -> dict:
    facts, copilot = state["facts"], state["copilot"]
    day = engine.day_of(copilot, copilot["current_day"])
    if state.get("nav_only") and day.get("reply"):
        return {"assistant_response": day["reply"]}  # coming back to a day replays what was said there
    if state.get("defer_reply"):
        return {}  # the caller streams the reply itself (see reply_prompt / hold_reply)
    try:
        text = await llm_service.generate(
            prompt=reply_prompt(facts), system_instruction=RESPOND_INSTRUCTION, temperature=0.6,
        )
    except Exception as exc:
        logger.warning("Copilot respond failed: %s", exc)
        text = ""
    text = hold_reply(copilot, str(text or "").strip() or _fallback_reply(facts))
    return {"copilot": copilot, "assistant_response": text}


def render(state: CopilotState) -> dict:
    copilot = state["copilot"]
    return {"itinerary_graph": build_itinerary_graph(
        markdown=engine.to_markdown(copilot), origin=state.get("origin"),
        destination=copilot["destination"], duration_days=len(copilot["days"]),
        extracted=engine.to_extracted(copilot, state.get("origin")),
    )}


def build_copilot_graph():
    graph = StateGraph(CopilotState)
    graph.add_node("init", init)
    graph.add_node("interpret", interpret)
    graph.add_node("apply", apply)
    graph.add_node("research", research_node)
    graph.add_node("recommend", recommend)
    graph.add_node("respond", respond)
    graph.add_node("render", render)
    graph.add_conditional_edges(START, lambda s: "interpret" if s.get("copilot") else "init",
                                {"init": "init", "interpret": "interpret"})
    graph.add_edge("init", "research")
    graph.add_edge("interpret", "apply")
    graph.add_conditional_edges("apply", lambda s: "research" if s.get("queries") else "recommend",
                                {"research": "research", "recommend": "recommend"})
    graph.add_edge("research", "recommend")
    graph.add_edge("recommend", "respond")
    graph.add_edge("respond", "render")
    graph.add_edge("render", END)
    return graph.compile()


copilot_graph = build_copilot_graph()


def _turn_input(state: dict[str, Any], defer_reply: bool = False) -> dict:
    copilot = copy.deepcopy(state.get("copilot")) if state.get("copilot") else None
    focus = state.get("focus_day")
    if copilot and type(focus) is int and 1 <= focus <= len(copilot["days"]):
        copilot["current_day"] = focus  # the day the traveler is looking at in the client
    return {"copilot": copilot, "defer_reply": defer_reply,
            **{k: state.get(k) for k in ("user_message", "ui_action", "destination", "duration_days", "origin",
                                         "currency", "budget_target", "planning_preferences",
                                         "places_to_visit", "user_name")}}


def _turn_output(result: dict) -> dict:
    return {"copilot": result["copilot"], "assistant_response": result.get("assistant_response") or "",
            "itinerary_graph": result["itinerary_graph"], "facts": result.get("facts"), "ui_action": None}


async def build_with_agent(state: dict[str, Any]) -> dict:
    """Main-graph adapter: run one build-with-agent turn and hand back the updated copilot."""
    return _turn_output(await copilot_graph.ainvoke(_turn_input(state)))


STAGES = {"init": "Reading traveler tips from Reddit and Quora", "interpret": "Working that into your plan",
          "research": "Checking what travelers recommend", "recommend": "Updating your day"}


async def stream_build_with_agent(state: dict[str, Any]):
    """Run a turn node by node for the streaming API.

    Yields ("stage", label) while it works, then ("result", output). The reply is left
    for the caller to stream from output["facts"]; a pure day switch returns the held reply.
    """
    merged = _turn_input(state, defer_reply=True)
    last_label = None
    async for update in copilot_graph.astream(merged, stream_mode="updates"):
        for node, delta in update.items():
            merged.update(delta or {})
            label = STAGES["research"] if node == "apply" and (delta or {}).get("queries") else STAGES.get(node)
            if label and label != last_label:
                last_label = label
                yield "stage", label
    yield "result", _turn_output(merged)
