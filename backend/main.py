from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
from contextlib import asynccontextmanager

from database import init_db, get_session
from models import WeatherSearchHistory, WeatherSearchCreate

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
    title="Weather Dashboard Backend ",
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

@app.get("/api/history", response_model=List[WeatherSearchHistory])
def get_histories(session: Session = Depends(get_session)):
    histories = session.exec(select(WeatherSearchHistory)).all()
    return histories

@app.post("/api/history", response_model=WeatherSearchHistory, status_code=status.HTTP_201_CREATED)
def create_history(data: WeatherSearchCreate, session: Session = Depends(get_session)):
    db_item = WeatherSearchHistory.model_validate(data)
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@app.delete("/api/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(history_id: int, session: Session = Depends(get_session)):
    item = session.get(WeatherSearchHistory, history_id)
    if not item:
        raise HTTPException(status_code=404, detail="Record not found")
    session.delete(item)
    session.commit()
    return None

# Mount thư mục Static Files cho Frontend
app.mount("/js", StaticFiles(directory="../frontend/js"), name="js")
app.mount("/css", StaticFiles(directory="../frontend/css"), name="css")