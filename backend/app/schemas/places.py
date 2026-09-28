from pydantic import BaseModel, Field


class PlaceMediaItem(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=160)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)


class PlaceMediaRequest(BaseModel):
    places: list[PlaceMediaItem] = Field(min_length=1, max_length=24)
