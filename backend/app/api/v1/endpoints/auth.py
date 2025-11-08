from fastapi import APIRouter, HTTPException, status, Depends
from pymongo.errors import DuplicateKeyError
from app.schemas import (
    UserCreate, UserLogin, Token, RefreshToken, UserResponse, OAuthLogin,
    EmailVerificationRequest, EmailVerificationVerify
)
from app.models import User
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.core.oauth import verify_google_token, verify_microsoft_token
from app.core.email import send_verification_email, verify_code
from app.db import get_database
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """register new user"""
    db = get_database()
    # check if user already exists
    existing_user = db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email already registered"
        )
    # create new user
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
    )
    try:
        result = db.users.insert_one(user.to_dict())
        user._id = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email already registered"
        )
    return UserResponse(
        id=str(user._id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    """login user and return access and refresh tokens"""
    db = get_database()
    # find user by email
    user_data = db.users.find_one({"email": user_in.email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="incorrect email or password"
        )
    user = User.from_dict(user_data)
    # verify password
    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="incorrect email or password"
        )
    # check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="inactive user"
        )
    # create tokens
    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/refresh", response_model=Token)
async def refresh_access_token(token_in: RefreshToken):
    """refresh access token using refresh token"""
    email = verify_token(token_in.refresh_token, token_type="refresh")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid refresh token"
        )
    db = get_database()
    user_data = db.users.find_one({"email": email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user not found"
        )
    user = User.from_dict(user_data)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="inactive user"
        )
    # create new tokens
    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/oauth/login", response_model=Token)
async def oauth_login(oauth_in: OAuthLogin):
    """login or register user using OAuth provider"""
    db = get_database()
    # verify token based on provider
    if oauth_in.provider == "google":
        user_info = verify_google_token(oauth_in.token)
    elif oauth_in.provider == "microsoft":
        user_info = verify_microsoft_token(oauth_in.token)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"unsupported OAuth provider: {oauth_in.provider}")
    oauth_id = user_info["sub"]
    email = user_info["email"]
    first_name = user_info.get("given_name")
    last_name = user_info.get("family_name")
    profile_url = user_info.get("picture")
    # check if user exists with this OAuth provider
    user_data = db.users.find_one({
        "oauth_provider": oauth_in.provider,
        "oauth_subject_id": oauth_id
    })
    if user_data:
        # existing OAuth user
        user = User.from_dict(user_data)
    else:
        # check if user exists with this email
        user_data = db.users.find_one({"email": email})
        if user_data:
            # user exists with email, link OAuth account
            user = User.from_dict(user_data)
            db.users.update_one(
                {"_id": user._id},
                {"$set": {
                    "oauth_provider": oauth_in.provider,
                    "oauth_subject_id": oauth_id,
                    "profile_url": profile_url
                }}
            )
            user.oauth_provider = oauth_in.provider
            user.oauth_subject_id = oauth_id
            user.profile_url = profile_url
        else:
            # create new user
            user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                oauth_provider=oauth_in.provider,
                oauth_subject_id=oauth_id,
                profile_url=profile_url,
            )
            result = db.users.insert_one(user.to_dict())
            user._id = result.inserted_id
    # check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="inactive user"
        )
    # create tokens
    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """get current user information"""
    return UserResponse(
        id=str(current_user._id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        oauth_provider=current_user.oauth_provider,
        profile_url=current_user.profile_url,
    )

@router.post("/email/send-code", status_code=status.HTTP_200_OK)
async def send_email_verification_code(request: EmailVerificationRequest):
    """send verification code to email"""
    try:
        send_verification_email(request.email)
        return {"message": "verification code sent"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"failed to send verification code: {str(e)}"
        )

@router.post("/email/verify", response_model=Token)
async def verify_email_and_login(request: EmailVerificationVerify):
    """verify email code and create/login user"""
    if not verify_code(request.email, request.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired verification code"
        )
    db = get_database()
    # check if user exists
    user_data = db.users.find_one({"email": request.email})
    if user_data:
        # existing user
        user = User.from_dict(user_data)
    else:
        # create new user without password (email-verified user)
        user = User(email=request.email)
        result = db.users.insert_one(user.to_dict())
        user._id = result.inserted_id
    # check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="inactive user"
        )
    # create tokens
    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )