from sqlmodel import create_engine, Session, SQLModel

DATABASE_URL = "postgresql+psycopg2://postgres:123456@localhost:5432/weather_db"

# Tạo SQLAlchemy Engine
engine = create_engine(DATABASE_URL, echo=True)

# Hàm khởi tạo tạo bảng tự động
def init_db():
    SQLModel.metadata.create_all(engine)

# Hàm Dependency cung cấp Session cho các route FastAPI
def get_session():
    with Session(engine) as session:
        yield session