"""JWT creation and verification using python-jose."""
from datetime import datetime, timedelta, timezone
from jose import jwt
from config import settings


def create_access_token(data: dict) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Raises JWTError if invalid."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])

