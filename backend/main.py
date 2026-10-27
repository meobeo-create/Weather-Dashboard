from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(
    title="Weather Dashboard Backend",
    description="Full-stack Weather Dashboard API & Server",
    version="2.0.0"
)

# --- 1. SỬ DỤNG PYDANTIC MODELS CHO REQUEST/RESPONSE BODY ---
class WeatherSearchRequest(BaseModel):
    city_name: str = Field(..., example="Hanoi", description="Tên thành phố cần tra cứu")
    units: Optional[str] = Field("metric", example="metric", description="Đơn vị đo: metric hoặc imperial")


# --- 2. PATH OPERATIONS, PATH & QUERY PARAMS ---

# Root endpoint: Phục vụ trang giao diện chính (Frontend index.html)
@app.get("/")
def serve_frontend():
    # Trỏ đường dẫn ra thư mục frontend ngang hàng với backend
    return FileResponse("../frontend/index.html")

# Ví dụ về Query Parameters (Tham số truy vấn trên URL, ví dụ: /api/weather?city=Hanoi)
@app.get("/api/weather")
def get_weather_by_query(city: str = Query(..., description="Tên thành phố")):
    return {
        "status": "success",
        "location": city,
        "message": f"Dữ liệu thời tiết giả lập cho {city}"
    }

# Ví dụ về Path Parameters (Tham số đường dẫn, ví dụ: /api/cities/123)
@app.get("/api/cities/{city_id}")
def get_city_details(city_id: int):
    return {
        "city_id": city_id,
        "country": "Vietnam",
        "description": "Chi tiết thông tin thành phố theo ID"
    }

# Ví dụ sử dụng Pydantic Model cho POST Request Body
@app.post("/api/user-preferences")
def save_user_preferences(preference: WeatherSearchRequest):
    return {
        "status": "success",
        "message": "Đã lưu cấu hình thành công!",
        "data": {
            "preferred_city": preference.city_name,
            "units": preference.units
        }
    }


# --- 3. MOUNT THƯ MỤC FRONTEND ĐỂ CHẠY FILE TĨNH (CSS, JS) ---
# Giúp FastAPI hiểu và đọc được các file trong thư mục frontend/ khi index.html gọi đến
app.mount("/static", StaticFiles(directory="../frontend"), name="static")