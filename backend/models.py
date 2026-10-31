# File: backend/models.py
from pydantic import BaseModel, ConfigDict
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone

class WeatherSearchCreate(BaseModel):
    city_name: str
    temperature: float
    condition: str

class WeatherSearchRead(WeatherSearchCreate):
    id: int
    searched_at: datetime

    # Thay vì dùng class Config cũ, hãy dùng model_config chuẩn Pydantic V2
    model_config = ConfigDict(from_attributes=True)

class WeatherSearchHistory(SQLModel, table=True):
    __tablename__ = "weather_search_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    city_name: str = Field(index=True)
    temperature: float
    condition: str
    searched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))