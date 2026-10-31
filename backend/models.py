from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone

# Định nghĩa bảng lưu lịch sử tra cứu thời tiết
class WeatherSearchHistory(SQLModel, table=True):
    __tablename__ = "weather_search_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    city_name: str = Field(index=True, description="Tên thành phố tra cứu")
    temperature: float = Field(description="Nhiệt độ ghi nhận")
    condition: str = Field(description="Mô tả thời tiết (ví dụ: Overcast, Sunny)")
    
    # Sử dụng datetime có kèm múi giờ UTC để khớp hoàn toàn với PostgreSQL TIMESTAMP WITH TIME ZONE
    searched_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        description="Thời gian tìm kiếm"
    )