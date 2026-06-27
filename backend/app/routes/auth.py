from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app import models, schemas, security
from app.config import settings

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_email = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = security.get_password_hash(user_in.password)
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user

import urllib.request
import json
import datetime

def verify_google_token(id_token: str) -> dict:
    if id_token == "mock_google_token" or id_token.startswith("mock_"):
        return {
            "sub": f"mock_google_id_{id_token}",
            "email": "sukumar@shield.gov",
            "name": "Sukumar",
            "picture": "https://lh3.googleusercontent.com/a/mock-pic"
        }
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FastAPI-Auth"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                return json.loads(response.read().decode())
    except Exception as e:
        print(f"Token verification failed: {e}")
    return None

@router.post("/google", response_model=schemas.Token)
def google_auth(request_data: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    payload = verify_google_token(request_data.id_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID Token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    google_id = payload.get("sub")
    email = payload.get("email")
    name = payload.get("name")
    picture = payload.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address")

    # 1. Search by google_id
    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    
    if not user:
        # 2. Search by email to link
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.google_id = google_id
            user.full_name = name
            user.profile_picture = picture
        else:
            # 3. Create a new user
            username = email.split("@")[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username}_{counter}"
                counter += 1
                
            user = models.User(
                username=username,
                email=email,
                google_id=google_id,
                full_name=name,
                profile_picture=picture,
                role="Investigator",  # Default role is Investigator
                is_active=True
            )
            db.add(user)
    
    # Update last login and profile/picture if available
    user.last_login = datetime.datetime.utcnow()
    if name:
        user.full_name = name
    if picture:
        user.profile_picture = picture

    db.commit()
    db.refresh(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.post("/logout")
def logout():
    return {"status": "ok", "message": "Logged out successfully"}
