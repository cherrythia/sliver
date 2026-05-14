"""Creates the target database if it does not exist. Run before Alembic migrations."""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "cockroachdb+psycopg2://root@localhost:26257/silver?sslmode=disable",
)


def create_database():
    if "cockroachdb" not in DATABASE_URL:
        return
    db_name = DATABASE_URL.rstrip("/").split("/")[-1].split("?")[0]
    root_url = DATABASE_URL.replace(f"/{db_name}", "/defaultdb")
    engine = create_engine(root_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {db_name}"))
    engine.dispose()
    print(f"Database '{db_name}' ready.")


if __name__ == "__main__":
    create_database()
