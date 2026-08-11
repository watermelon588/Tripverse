from enum import Enum
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    COUNTRY = "COUNTRY"
    CITY = "CITY"
    NEIGHBORHOOD = "NEIGHBORHOOD"
    ATTRACTION = "ATTRACTION"
    RESTAURANT = "RESTAURANT"
    ACTIVITY = "ACTIVITY"
    HOTEL = "HOTEL"
    TRANSPORT = "TRANSPORT"


class GraphNode(BaseModel):
    id: str
    type: NodeType
    name: str
    description: Optional[str] = None
    position: Optional[Tuple[float, float, float]] = Field(
        default=None, description="3D coordinates [x, y, z]"
    )


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str
    cost: Optional[float] = None
    duration: Optional[float] = None


class TripResponse(BaseModel):
    id: str
    destination: str
    days: int
    budget: float
    nodes: List[GraphNode]
    edges: List[GraphEdge]
