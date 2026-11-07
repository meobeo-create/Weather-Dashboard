from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select, Field, Relationship
from typing import List, Optional
from contextlib import asynccontextmanager
from passlib.context import CryptContext
from pydantic import BaseModel
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import uuid
import smtplib

from database import init_db, get_session, engine, redis_client
from models import User, UserRegister, UserLogin, FavoriteLocation, FavoriteCreate, WeatherSearchHistory, WeatherSearchCreate

# Cấu hình mã hóa mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])  # Bcrypt chỉ hỗ trợ tối đa 72 ký tự

def verify_password(plain_password: str, hashed_password: str) -> str:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

# Hàm lấy thông tin User hiện tại dựa vào Header Authorization (Token lưu trong Redis)
def get_current_user(authorization: Optional[str] = Header(default=None), session: Session = Depends(get_session)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Không tìm thấy token xác thực hợp lệ")
    
    token = authorization.split(" ")[1]
    user_id = redis_client.get(f"session:{token}")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn hoặc không tồn tại")
    
    user = session.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Người dùng không tồn tại")
    return user

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Tạo sẵn một tài khoản Admin mẫu nếu chưa có
    with Session(engine) as session:
        admin_check = session.exec(select(User).where(User.username == "admin")).first()
        if not admin_check:
            admin_user = User(
                username="admin",
                email="admin@neu.edu.vn",
                hashed_password=hash_password("admin123"),
                role="admin"
            )
            session.add(admin_user)
            session.commit()
            print(">>> [INIT] Đã tạo tài khoản Admin mặc định: admin / admin123")
    yield

app = FastAPI(
    title="Weather Dashboard Backend - Advanced",
    description="Full-stack Weather Dashboard API with PostgreSQL, SQLModel, Redis & Auth",
    version="5.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, session: Session = Depends(get_session)):
    if not data.agree_terms:
        raise HTTPException(status_code=400, detail="Bạn phải đồng ý với các điều khoản sử dụng")
    
    existing_user = session.exec(select(User).where((User.username == data.username) | (User.email == data.email))).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Tên tài khoản hoặc Email đã tồn tại")
    
    new_user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="user"
    )
    session.add(new_user)
    session.commit()
    return {"message": "Đăng ký tài khoản thành công!"}

@app.post("/api/auth/login")
def login(data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == data.username)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Sai tên đăng nhập hoặc mật khẩu")
    
    # Tạo Session Token và lưu vào Redis với thời hạn 24 giờ (86400 giây)
    token = str(uuid.uuid4())
    redis_client.setex(f"session:{token}", 86400, user.id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role
    }

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        redis_client.delete(f"session:{token}")
    return {"message": "Đăng xuất thành công"}



OTP_STORE = {}

# Cấu hình tài khoản Gmail của bạn dùng để gửi mail
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SENDER_EMAIL = "conghiept3@gmail.com"        # Thay bằng email của bạn
SENDER_PASSWORD = "sbis apha npex lvzm"         # Thay bằng Mật khẩu ứng dụng 16 ký tự ở Bước 1

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/api/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email này chưa được đăng ký trong hệ thống!")
    
    # Tạo mã OTP ngẫu nhiên 6 chữ số
    otp_code = str(random.randint(100000, 999999))
    OTP_STORE[data.email] = otp_code
    
    # --- TIẾN HÀNH GỬI EMAIL THẬT ---
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Mã xác thực khôi phục mật khẩu - Weather Dashboard"
        message["From"] = SENDER_EMAIL
        message["To"] = data.email

        # Nội dung email dạng HTML đẹp mắt
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #0066cc; text-align: center; margin-bottom: 10px;">Weather Dashboard</h2>
              <h4 style="text-align: center; color: #555; margin-top: 0;">Khôi phục mật khẩu tài khoản</h4>
              <p>Xin chào bạn,</p>
              <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.</p>
              <p>Mã OTP xác thực của bạn là:</p>
              <div style="text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 6px; background: #e8f5e9; padding: 10px 20px; border-radius: 6px;">{otp_code}</span>
              </div>
              <p style="font-size: 13px; color: #777;">Mã này có hiệu lực trong vòng vài phút. Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
            </div>
          </body>
        </html>
        """
        message.attach(MIMEText(html_content, "html"))

        # Kết nối đến máy chủ SMTP của Google và gửi
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, data.email, message.as_string())
            
    except Exception as e:
        print(f"Lỗi gửi email: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể gửi email OTP qua hệ thống. Vui lòng thử lại sau!")
    
    return {"message": f"Mã OTP đã được gửi thành công đến email {data.email}!"}
@app.post("/api/auth/reset-password")
def reset_password(data: ResetPasswordRequest, session: Session = Depends(get_session)):
    # Kiểm tra xem mã OTP có khớp với email hay không
    valid_otp = OTP_STORE.get(data.email)
    if not valid_otp or valid_otp != data.otp:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác hoặc đã hết hạn!")
    
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại!")
    
    # Cập nhật mật khẩu mới (đã mã hóa bcrypt) vào Database
    user.hashed_password = get_password_hash(data.new_password)
    session.add(user)
    session.commit()
    
    # Xóa OTP sau khi dùng xong
    OTP_STORE.pop(data.email, None)
    
    return {"message": "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."}

class FavoriteCreate(BaseModel):
    city_name: str
    latitude: float
    longitude: float

# 1. Thêm thành phố vào danh sách yêu thích
@app.post("/api/favorites")
def add_favorite(data: FavoriteCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # ❌ XÓA BỎ các đoạn code tự gọi API tìm tọa độ dựa vào data.city_name ở đây (nếu có)
    
    # ✅ DÙNG TRỰC TIẾP tọa độ do Frontend gửi lên trong gói tin JSON (data.latitude, data.longitude)
    new_favorite = FavoriteLocation(
        user_id=current_user.id,
        city_name=data.city_name,
        latitude=data.latitude,     # Lấy thẳng từ request body
        longitude=data.longitude    # Lấy thẳng từ request body
    )
    
    session.add(new_favorite)
    session.commit()
    session.refresh(new_favorite)
    return {"message": "Đã thêm vào danh sách yêu thích thành công!"}

# 2. Lấy danh sách thành phố yêu thích của user đang đăng nhập
@app.get("/api/favorites")
def get_favorites(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    favorites = session.exec(
        select(FavoriteLocation).where(FavoriteLocation.user_id == current_user.id)
    ).all()
    return favorites

# 3. Xóa một thành phố khỏi danh sách yêu thích
@app.delete("/api/favorites/{fav_id}")
def delete_favorite(fav_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    fav = session.exec(
        select(FavoriteLocation).where(
            FavoriteLocation.id == fav_id,
            FavoriteLocation.user_id == current_user.id
        )
    ).first()
    
    if not fav:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm yêu thích này!")
    
    session.delete(fav)
    session.commit()
    
    return {"message": "Đã xóa thành công khỏi danh sách yêu thích!"}

# --- HISTORY ENDPOINTS (Cá nhân hóa theo từng User) ---
@app.get("/api/history", response_model=List[WeatherSearchHistory])
def get_histories(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(WeatherSearchHistory).where(WeatherSearchHistory.user_id == current_user.id).order_by(WeatherSearchHistory.searched_at.desc())
    return session.exec(statement).all()

@app.post("/api/history", response_model=WeatherSearchHistory, status_code=status.HTTP_201_CREATED)
def create_history(data: WeatherSearchCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_item = WeatherSearchHistory(
        user_id=current_user.id,
        city_name=data.city_name,
        temperature=data.temperature,
        condition=data.condition
    )
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@app.delete("/api/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(history_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    item = session.get(WeatherSearchHistory, history_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử")
    session.delete(item)
    session.commit()
    return None

# --- STATIC FILES & FRONTEND ROUTE ---
@app.get("/")
def serve_frontend():
    return FileResponse("../frontend/index.html")

app.mount("/js", StaticFiles(directory="../frontend/js"), name="js")
app.mount("/css", StaticFiles(directory="../frontend/css"), name="css")
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

