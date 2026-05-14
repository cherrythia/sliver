import uuid
from sqlalchemy import Column, Integer, Text, Date, ForeignKey, Index
from sqlalchemy.types import Uuid
from app.db.database import Base


class DelayCode(Base):
    __tablename__ = "delay_codes"
    code = Column(Text, primary_key=True)
    description = Column(Text)
    vehicle_type = Column(Text)


class SubwayDelay(Base):
    __tablename__ = "subway_delays"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date)
    time = Column(Text)
    day = Column(Text)
    station = Column(Text)
    code = Column(Text, ForeignKey("delay_codes.code", ondelete="SET NULL"))
    min_delay = Column(Integer)
    min_gap = Column(Integer)
    bound = Column(Text)
    line = Column(Text)
    vehicle = Column(Integer)


Index("ix_subway_delays_station", SubwayDelay.station)
Index("ix_subway_delays_date", SubwayDelay.date)
Index("ix_subway_delays_line", SubwayDelay.line)
