from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    admin = "admin"
    customer = "customer"

class FlightStatus(str, enum.Enum):
    scheduled = "Scheduled"
    delayed = "Delayed"
    departed = "Departed"
    in_air = "In Air"
    landed = "Landed"
    cancelled = "Cancelled"

class BookingStatus(str, enum.Enum):
    confirmed = "Confirmed"
    cancelled = "Cancelled"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    email = Column(String(100), unique=True, index=True)
    password = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.customer)
    bookings = relationship("Booking", back_populates="user")

class Flight(Base):
    __tablename__ = "flights"
    id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String(20), unique=True, index=True)
    origin = Column(String(50))
    destination = Column(String(50))
    departure_time = Column(DateTime)
    arrival_time = Column(DateTime)
    total_seats = Column(Integer, default=40)
    booked_seats = Column(Integer, default=0)
    status = Column(Enum(FlightStatus), default=FlightStatus.scheduled)
    bookings = relationship("Booking", back_populates="flight")

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    flight_id = Column(Integer, ForeignKey("flights.id"))
    seat_count = Column(Integer, default=1) 
    booking_date = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(BookingStatus), default=BookingStatus.confirmed)
    user = relationship("User", back_populates="bookings")
    flight = relationship("Flight", back_populates="bookings")