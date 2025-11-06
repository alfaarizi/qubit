from fastapi import APIRouter, HTTPException, status, Depends
from ....schemas.user import UserCreate, UserLogin, Token, User
from ....core.security import verify_password, get_password_hash, create_access_token
from ....core.deps import get_current_user_email
from ....db.mongodb import MongoDB
from datetime import datetime

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """register a new user"""
    db = MongoDB.get_db()
    # check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # create user
    hashed_password = get_password_hash(user_data.password)
    created_at = int(datetime.now().timestamp() * 1000)
    user_dict = {
        "email": user_data.email,
        "hashedPassword": hashed_password,
        "createdAt": created_at
    }
    await db.users.insert_one(user_dict)
    # create access token
    access_token = create_access_token(data={"sub": user_data.email})
    return Token(
        accessToken=access_token,
        tokenType="bearer",
        user=User(email=user_data.email, createdAt=created_at)
    )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """login user"""
    db = MongoDB.get_db()
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashedPassword"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    # create access token
    access_token = create_access_token(data={"sub": credentials.email})
    return Token(
        accessToken=access_token,
        tokenType="bearer",
        user=User(email=user["email"], createdAt=user["createdAt"])
    )

@router.get("/me", response_model=User)
async def get_current_user(email: str = Depends(get_current_user_email)):
    """get current user info"""
    db = MongoDB.get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return User(email=user["email"], createdAt=user["createdAt"])
