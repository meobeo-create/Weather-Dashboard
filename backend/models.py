from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, timezone

class User(SQLModel, table=True):
    __tablename__ = "user"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str
    role: str = Field(default="user")  # "admin" hoặc "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    favorites: List["FavoriteLocation"] = Relationship(back_populates="user", cascade_delete=True)
    histories: List["WeatherSearchHistory"] = Relationship(back_populates="user", cascade_delete=True)

class UserRegister(SQLModel):
    username: str
    email: str
    password: str
    agree_terms: bool  # Checkbox đồng ý điều khoản

class UserLogin(SQLModel):
    username: str
    password: str

class FavoriteLocation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    city_name: str
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)

    user: Optional[User] = Relationship(back_populates="favorites")

class FavoriteCreate(SQLModel):
    city_name: str
    latitude: float
    longitude: float

class WeatherSearchHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    city_name: str
    temperature: float
    condition: str
    searched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: Optional[User] = Relationship(back_populates="histories")

class WeatherSearchCreate(SQLModel):
    city_name: str
    temperature: float
    condition: str