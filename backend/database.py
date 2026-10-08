from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DATABASE_URL = "sqlite:///notebook.db"


engine = create_engine(DATABASE_URL, echo=True)


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(bind=engine)