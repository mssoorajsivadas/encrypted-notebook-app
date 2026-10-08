from datetime import datetime

from sqlalchemy import LargeBinary, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    username: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False
    )

    salt: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )

    verification_nonce: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )

    verification_data: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    encrypted_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )