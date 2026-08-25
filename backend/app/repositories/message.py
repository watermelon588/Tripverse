import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import MessageRole, MessageType
from app.models.trip import ConversationMessage


class MessageRepository:
    """Repository handling database access for ConversationMessage entities."""

    async def create_message(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        role: MessageRole,
        message_type: MessageType = MessageType.TEXT,
        content: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> ConversationMessage:
        """Create and add a ConversationMessage record to the DB session."""
        msg = ConversationMessage(
            session_id=session_id,
            role=role,
            message_type=message_type,
            content=content,
            payload=payload,
        )
        db.add(msg)
        return msg

    async def get_messages_by_session_id(
        self, db: AsyncSession, session_id: uuid.UUID
    ) -> List[ConversationMessage]:
        """Fetch all messages for a conversation session ordered chronologically."""
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.session_id == session_id)
            .order_by(ConversationMessage.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
