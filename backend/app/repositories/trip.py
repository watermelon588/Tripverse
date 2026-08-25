import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import OnboardingStatus, TripStatus
from app.models.trip import Trip


class TripRepository:
    """Repository handling database access for Trip entities."""

    async def create_trip(
        self, db: AsyncSession, currency: str = "INR"
    ) -> Trip:
        """Create and flush a new Trip record."""
        new_trip = Trip(
            status=TripStatus.DRAFT,
            onboarding_status=OnboardingStatus.IN_PROGRESS,
            currency=currency,
        )
        db.add(new_trip)
        await db.flush()
        return new_trip

    async def get_by_id(
        self, db: AsyncSession, trip_id: uuid.UUID
    ) -> Optional[Trip]:
        """Fetch a Trip by its primary key ID."""
        stmt = select(Trip).where(Trip.id == trip_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
