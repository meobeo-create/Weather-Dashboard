from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
from contextlib import asynccontextmanager

from database import init_db, get_session
from models import WeatherSearchHistory

# --- SEED DATA (Dữ liệu mẫu ban đầu) ---
def seed_initial_data():
    from database import engine
    with Session(engine) as session:
        # Kiểm tra xem bảng đã có dữ liệu chưa để tránh seed trùng lặp
        statement = select(WeatherSearchHistory)
        existing_records = session.exec(statement).first()
        
        if not existing_records:
            initial_histories = [
                WeatherSearchHistory(city_name="Hanoi", temperature=23.5, condition="Overcast"),
                WeatherSearchHistory(city_name="Sydney", temperature=18.0, condition="Rainy"),
                WeatherSearchHistory(city_name="Tokyo", temperature=15.2, condition="Clear sky")
            ]
            session.add_all(initial_histories)
            session.commit()
            print(">>> [SEED DATA] Đã khởi tạo dữ liệu mẫu thành công vào PostgreSQL!")

# --- LIFESPAN QUẢN LÝ KHỞI ĐỘNG ỨNG DỤNG ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo bảng và seed data khi server bật lên
    init_db()
    seed_initial_data()
    yield
    # Code dọn dẹp khi tắt server (nếu có)

app = FastAPI(
    title="Weather Dashboard Backend - Week 9",
    description="Full-stack Weather Dashboard API with PostgreSQL & SQLModel",
    version="4.0.0",
    lifespan=lifespan
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phục vụ Frontend
@app.get("/")
def serve_frontend():
    return FileResponse("../frontend/index.html")


# ==========================================
# CÁC ENDPOINT CRUD CHO LỊCH SỬ THỜI TIẾT
# ==========================================

# 1. CREATE: Thêm một lịch sử tìm kiếm mới vào Database
@app.post("/api/history", response_model=WeatherSearchHistory, status_code=status.HTTP_201_CREATED)
def create_search_history(history: WeatherSearchHistory, session: Session = Depends(get_session)):
    session.add(history)
    session.commit()
    session.refresh(history)
    return history


# 2. READ: Lấy danh sách toàn bộ lịch sử tìm kiếm từ PostgreSQL
@app.get("/api/history", response_model=List[WeatherSearchHistory])
def get_search_histories(session: Session = Depends(get_session)):
    statement = select(WeatherSearchHistory)
    histories = session.exec(statement).all()
    return histories


# 3. DELETE: Xóa một bản ghi lịch sử theo ID
@app.delete("/api/history/{history_id}", status_code=status.HTTP_200_OK)
def delete_search_history(history_id: int, session: Session = Depends(get_session)):
    history = session.get(WeatherSearchHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lịch sử này")
    
    session.delete(history)
    session.commit()
    return {"status": "success", "message": f"Đã xóa lịch sử ID {history_id} thành công"}


# Mount thư mục Static Files cho Frontend
app.mount("/static", StaticFiles(directory="../frontend"), name="static")