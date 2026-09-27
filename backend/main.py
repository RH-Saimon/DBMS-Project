from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, auth
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# টেবিল স্বয়ংক্রিয়ভাবে তৈরি হবে
Base.metadata.create_all(bind=engine)
app = FastAPI(title="SkyFlow API")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(name=user.name, email=user.email, password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    return new_user

@app.post("/login", response_model=schemas.Token)
def login_user(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = auth.create_access_token(data={"email": user.email, "role": user.role.value if hasattr(user.role, 'value') else user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/flights", response_model=schemas.FlightResponse)
def create_flight(flight: schemas.FlightCreate, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] != "admin": raise HTTPException(status_code=403, detail="Not admin")
    new_flight = models.Flight(**flight.dict())
    db.add(new_flight)
    db.commit()
    db.refresh(new_flight)
    return new_flight

@app.get("/flights", response_model=List[schemas.FlightResponse])
def get_flights(db: Session = Depends(get_db)):
    return db.query(models.Flight).all()

@app.delete("/flights/{flight_id}")
def delete_flight(flight_id: int, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    flight = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    db.delete(flight)
    db.commit()
    return {"message": "Deleted"}

@app.post("/bookings")
def create_booking(booking_data: schemas.BookingCreate, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    flight = db.query(models.Flight).filter(models.Flight.id == booking_data.flight_id).first()
    
    flight.booked_seats += booking_data.seat_count
    new_booking = models.Booking(user_id=user.id, flight_id=flight.id, seat_count=booking_data.seat_count)
    db.add(new_booking)
    db.commit()
    return {"message": "Success"}

@app.get("/bookings/me")
def get_my_bookings(db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    bookings = db.query(models.Booking).filter(models.Booking.user_id == user.id).all()
    return [{"id": b.id, "status": b.status, "seat_count": b.seat_count, "flight_id": b.flight_id} for b in bookings]

@app.get("/bookings")
def get_all_bookings(db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] != "admin": raise HTTPException(status_code=403)
    bookings = db.query(models.Booking).all()
    return [{"id": b.id, "status": b.status, "seat_count": b.seat_count, "flight_id": b.flight_id} for b in bookings]

@app.get("/track/{flight_number}")
def track_flight(flight_number: str, db: Session = Depends(get_db)):
    flight = db.query(models.Flight).filter(models.Flight.flight_number == flight_number).first()
    if not flight: raise HTTPException(status_code=404)
    return flight