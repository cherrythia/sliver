import json
import os
from typing import Callable
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import anthropic

from app.models.subway import SubwayDelay, DelayCode


def _extract_query_params(query: str) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=(
                "Extract subway query parameters. Return ONLY valid JSON with these optional fields: "
                '{"station": "STATION NAME IN CAPS or null", "line": "BD or YU or SHP or SRT or null", '
                '"year": integer_or_null, "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null"}.'
            ),
            messages=[{"role": "user", "content": query}],
        )
        return json.loads(response.content[0].text)
    except Exception:
        return {}


def query_subway_db(input: str, db: Session = None) -> str:
    params = _extract_query_params(input)

    q = db.query(
        SubwayDelay.date,
        SubwayDelay.station,
        SubwayDelay.line,
        SubwayDelay.code,
        SubwayDelay.min_delay,
        SubwayDelay.bound,
        DelayCode.description,
    ).join(DelayCode, SubwayDelay.code == DelayCode.code, isouter=True)

    if params.get("station"):
        q = q.filter(SubwayDelay.station.ilike(f"%{params['station']}%"))
    if params.get("line"):
        q = q.filter(SubwayDelay.line == params["line"])
    if params.get("year"):
        q = q.filter(extract("year", SubwayDelay.date) == params["year"])
    if params.get("start_date"):
        q = q.filter(SubwayDelay.date >= params["start_date"])
    if params.get("end_date"):
        q = q.filter(SubwayDelay.date <= params["end_date"])

    results = q.order_by(SubwayDelay.min_delay.desc()).limit(50).all()

    if not results:
        results = (
            db.query(
                SubwayDelay.date, SubwayDelay.station, SubwayDelay.line,
                SubwayDelay.code, SubwayDelay.min_delay, SubwayDelay.bound,
                DelayCode.description,
            )
            .join(DelayCode, SubwayDelay.code == DelayCode.code, isouter=True)
            .order_by(SubwayDelay.min_delay.desc())
            .limit(20)
            .all()
        )

    return json.dumps([
        {
            "date": str(r.date),
            "station": r.station,
            "line": r.line,
            "code": r.code,
            "cause": r.description or r.code,
            "min_delay": r.min_delay,
            "bound": r.bound,
        }
        for r in results
    ])


def calculate_average_delay(input: str, db: Session = None) -> str:
    q = db.query(
        SubwayDelay.station,
        DelayCode.description,
        func.count(SubwayDelay.id).label("count"),
        func.avg(SubwayDelay.min_delay).label("avg_delay"),
    ).join(DelayCode, SubwayDelay.code == DelayCode.code, isouter=True)

    if input.strip():
        q = q.filter(SubwayDelay.station.ilike(f"%{input.strip()}%"))

    results = (
        q.group_by(SubwayDelay.station, DelayCode.description)
        .order_by(func.avg(SubwayDelay.min_delay).desc())
        .limit(20)
        .all()
    )

    return json.dumps([
        {
            "station": r.station,
            "cause": r.description or "Unknown",
            "count": r.count,
            "avg_delay_minutes": round(float(r.avg_delay or 0), 1),
        }
        for r in results
    ])


TOOL_REGISTRY: dict[str, Callable] = {
    "query_subway_db": query_subway_db,
    "calculate_average_delay": calculate_average_delay,
}
