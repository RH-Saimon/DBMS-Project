from pydantic import BaseModel
from models import UserRole, FlightStatus, BookingStatus
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole = UserRole.customer

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class FlightCreate(BaseModel):
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime

class FlightUpdate(BaseModel):
    status: FlightStatus

class FlightResponse(BaseModel):
    id: int
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    booked_seats: int
    status: FlightStatus
    class Config:
        from_attributes = True 

class BookingCreate(BaseModel):
    flight_id: int
    seat_count: int

class BookingResponse(BaseModel):
    id: int
    user_id: int
    flight_id: int
    seat_count: int
    booking_date: datetime
    status: BookingStatus
    flight: Optional[FlightResponse] = None
    class Config:
        from_attributes = True