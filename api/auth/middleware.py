"""FastAPI JWT authentication dependency."""
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from api.auth.jwt import verify_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> dict:
    """FastAPI dependency — validates JWT and returns payload."""
    try:
        payload = verify_token(credentials.credentials)
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def require_approver(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency — requires approver role."""
    if current_user.get("role") != "approver":
        raise HTTPException(status_code=403, detail="Approver role required")
    return current_user


async def require_escalation(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency — requires escalation role."""
    if current_user.get("role") != "escalation":
        raise HTTPException(status_code=403, detail="Escalation role required")
    return current_user


async def require_agent(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency — requires approver or escalation role."""
    if current_user.get("role") not in ("approver", "escalation"):
        raise HTTPException(status_code=403, detail="Agent role required")
    return current_user


