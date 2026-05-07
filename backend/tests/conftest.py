import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://silver:silver@localhost:5432/silver"
)


@pytest.fixture(scope="session")
def db_engine():
    from app.db.database import Base
    import app.models.workflow  # noqa: F401
    import app.models.subway    # noqa: F401
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    yield engine


@pytest.fixture()
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    from app.main import app
    from app.db.database import get_db
    app.dependency_overrides[get_db] = lambda: (yield db_session)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
