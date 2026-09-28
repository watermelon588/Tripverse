"""The trip document: one normalized trip that the studio, sketchbook and every export read.

It is the same shape for both planning modes, so views and exports never disagree.
"""

from datetime import date
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DocItem(BaseModel):
    name: str
    category: str = "other"
    time_of_day: Optional[Literal["morning", "afternoon", "evening"]] = None
    area: Optional[str] = None
    est_cost: Optional[float] = None  # per person, trip currency (build-with-the-agent estimates)
    duration_hours: Optional[float] = None
    tip: Optional[str] = None  # the traveler insight behind the suggestion
    source_url: Optional[str] = None
    option: bool = False  # one of several alternatives the plan offers for that day


class DocDay(BaseModel):
    day: int
    date: Optional[date] = None
    base: str
    items: list[DocItem] = Field(default_factory=list)
    est_cost: Optional[float] = None  # whole party, from the agent's day total
    hours: Optional[float] = None


class DocLeg(BaseModel):
    source: str
    target: str
    mode: Optional[str] = None
    duration: Optional[str] = None
    distance: Optional[str] = None
    cost: Optional[str] = None


class DocBudget(BaseModel):
    currency: str
    target: Optional[float] = None
    planned: Optional[float] = None  # the agent's running total (stay, food, plans, local travel)
    entered: float = 0.0  # amounts the traveler entered or accepted in the budget planner
    projected: float = 0.0  # entered + suggestions still pending


class DocTravelers(BaseModel):
    adults: int = 1
    children: int = 0


class TripDocument(BaseModel):
    trip_id: UUID
    mode: Literal["agent", "one_shot", "none"]
    status: Optional[Literal["building", "complete"]] = None  # build-with-the-agent progress
    destination: Optional[str] = None
    origin: Optional[str] = None
    duration_days: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    travelers: DocTravelers = Field(default_factory=DocTravelers)
    comfort: str = "mid_range"
    travel_mode: str = "transit"
    pace: str = "balanced"
    interests: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)
    must_see: list[str] = Field(default_factory=list)
    guide: Optional[str] = None
    days: list[DocDay] = Field(default_factory=list)
    legs: list[DocLeg] = Field(default_factory=list)
    budget: DocBudget
    graph: Optional[dict] = None  # the itinerary graph the map and 3D views render
