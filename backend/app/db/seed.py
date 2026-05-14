import os
import uuid
from datetime import datetime
import pandas as pd
from sqlalchemy import create_engine, text
from app.db.database import DATABASE_URL, SessionLocal
from app.models.subway import SubwayDelay, DelayCode
from app.models.workflow import Workflow

DATA_DIR = os.getenv("DATA_DIR", "/app/data")

TORONTO_NODES = [
    {
        "id": "node-input-1",
        "type": "input",
        "order": 0,
        "config": {
            "variable_name": "user_query",
            "default_value": "What were the main causes of delays at Union Station last year?",
        },
    },
    {
        "id": "node-tool-1",
        "type": "tool",
        "order": 1,
        "config": {
            "tool_name": "query_subway_db",
            "input_variable": "user_query",
            "output_variable": "db_results",
        },
    },
    {
        "id": "node-prompt-1",
        "type": "prompt",
        "order": 2,
        "config": {
            "prompt_template": (
                "You are a Toronto Transit Commission data analyst.\n"
                "A user asked: {{user_query}}\n\n"
                "Here is the relevant subway delay data:\n{{db_results}}\n\n"
                "Provide a clear, concise summary of the key findings. "
                "Highlight the most common causes, affected stations, and any notable patterns."
            ),
            "output_variable": "analysis",
        },
    },
]


def _ensure_database():
    # CockroachDB does not auto-create databases. Connect to defaultdb first
    # and create the target database if it doesn't already exist.
    if "cockroachdb" not in DATABASE_URL:
        return
    root_url = DATABASE_URL.replace("/silver", "/defaultdb")
    engine = create_engine(root_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        conn.execute(text("CREATE DATABASE IF NOT EXISTS silver"))
    engine.dispose()


def seed():
    _ensure_database()
    db = SessionLocal()
    try:
        _seed_subway_data(db)
        _seed_toronto_workflow(db)
    finally:
        db.close()


def _seed_subway_data(db):
    if db.query(DelayCode).first() is not None:
        print("Subway data already seeded, skipping.")
        return

    print("Seeding delay codes...")
    codes_df = pd.read_csv(os.path.join(DATA_DIR, "Toronto-Subway-Delay-Codes.csv"))
    db.bulk_save_objects([
        DelayCode(
            code=str(row["RMENU CODE"]).strip(),
            description=str(row["CODE DESCRIPTION"]).strip(),
            vehicle_type=str(row["Vehicle Type"]).strip(),
        )
        for _, row in codes_df.iterrows()
        if pd.notna(row["RMENU CODE"])
    ])
    db.flush()

    print("Seeding subway delays (may take ~30 seconds)...")
    delays_df = pd.read_csv(os.path.join(DATA_DIR, "Toronto-Subway-Delay-Jan-2014-Jun-2021.csv"))
    delays_df["Min Delay"] = pd.to_numeric(delays_df["Min Delay"], errors="coerce").fillna(0).astype(int)
    delays_df["Min Gap"] = pd.to_numeric(delays_df["Min Gap"], errors="coerce").fillna(0).astype(int)
    delays_df["Vehicle"] = pd.to_numeric(delays_df["Vehicle"], errors="coerce").fillna(0).astype(int)

    # Build set of known codes to avoid FK violations for codes present in delays
    # but absent from the codes reference table.
    known_codes = {row.code for row in db.query(DelayCode.code).all()}

    batch, batch_size = [], 5000
    for _, row in delays_df.iterrows():
        try:
            date = datetime.strptime(str(row["Date"]), "%Y/%m/%d").date()
        except ValueError:
            continue
        raw_code = str(row["Code"]).strip() if pd.notna(row["Code"]) else None
        code = raw_code if raw_code and raw_code in known_codes else None
        batch.append(SubwayDelay(
            date=date,
            time=str(row["Time"]),
            day=str(row["Day"]),
            station=str(row["Station"]).strip().upper(),
            code=code,
            min_delay=int(row["Min Delay"]),
            min_gap=int(row["Min Gap"]),
            bound=str(row["Bound"]).strip() if pd.notna(row["Bound"]) else None,
            line=str(row["Line"]).strip() if pd.notna(row["Line"]) else None,
            vehicle=int(row["Vehicle"]),
        ))
        if len(batch) >= batch_size:
            db.bulk_save_objects(batch)
            db.flush()
            batch = []
    if batch:
        db.bulk_save_objects(batch)
    db.commit()
    print("Subway data seeded.")


def _seed_toronto_workflow(db):
    if db.query(Workflow).filter_by(name="Toronto Subway Analyst").first():
        print("Toronto workflow already exists, skipping.")
        return
    db.add(Workflow(name="Toronto Subway Analyst", nodes=TORONTO_NODES))
    db.commit()
    print("Toronto Subway Analyst workflow seeded.")


if __name__ == "__main__":
    seed()
