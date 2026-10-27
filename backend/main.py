import time
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, Depends, Request, Response, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Weather Dashboard Backend - Week 8",
    description="Full-stack Weather Dashboard API with Middleware, Dependencies & Sessions",
    version="3.0.0"
)

# Cấu hình CORS Middleware cho phép Frontend gọi API từ mọi nguồn (hoặc cấu hình cụ thể domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong thực tế sản phẩm nên thay bằng domain cụ thể của frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware: Tự động đo và thêm header thời gian xử lý request vào Response
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    # Thêm custom header vào response trả về client
    response.headers["X-Process-Time"] = f"{process_time:.4f} sec"
    return response



class UserSettings(BaseModel):
    city_name: str = Field(..., example="Hanoi")
    units: str = Field("metric", example="metric")



# Hàm Dependency dùng chung để chuẩn hóa và kiểm tra tham số phân trang / truy vấn
def common_query_parameters(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm phụ trợ"),
    limit: int = Query(10, ge=1, le=50, description="Giới hạn số lượng bản ghi trả về")
):
    return {"q": q, "limit": limit}


# Phục vụ giao diện Frontend chính
@app.get("/")
def serve_frontend():
    return FileResponse("../frontend/index.html")

# Endpoint ứng dụng Dependency dùng chung
@app.get("/api/search-history")
def get_search_history(commons: dict = Depends(common_query_parameters)):
    return {
        "status": "success",
        "query_info": commons,
        "message": "Lấy lịch sử tìm kiếm thành công qua Dependency!"
    }

# Endpoint quản lý Cookies (Lưu trạng thái thành phố gần nhất - Khắc phục HTTP Stateless)
@app.post("/api/preferences/set")
def set_user_preference(settings: UserSettings, response: Response):
    # Lưu tên thành phố vào Cookie của trình duyệt (có hiệu lực trong 7 ngày = 604800 giây)
    response.set_cookie(key="preferred_city", value=settings.city_name, max_age=604800)
    response.set_cookie(key="preferred_units", value=settings.units, max_age=604800)
    return {
        "status": "success",
        "message": f"Đã lưu cấu hình (Thành phố: {settings.city_name}, Đơn vị: {settings.units}) vào Cookie thành công!"
    }

@app.get("/api/preferences/get")
def get_user_preference(
    preferred_city: Optional[str] = Cookie(None),
    preferred_units: Optional[str] = Cookie(None)
):
    return {
        "status": "success",
        "cookie_data": {
            "preferred_city": preferred_city or "Chưa thiết lập",
            "preferred_units": preferred_units or "metric"
        }
    }

# Mount thư mục Static Files để phục vụ CSS, JS cho Frontend
app.mount("/static", StaticFiles(directory="../frontend"), name="static")