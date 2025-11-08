"""OAuth providers verification"""
from typing import Dict, Any
import requests
from jose import jwt
from fastapi import HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.config import settings


def verify_google_token(token: str) -> Dict[str, Any]:
    """verify Google ID token and return user information"""
    try:
        # verify the token using Google's official library
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        # verify email is verified
        if not idinfo.get("email_verified", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="email not verified"
            )
        return idinfo
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"failed to verify Google token: {str(e)}"
        )

def verify_microsoft_token(token: str) -> Dict[str, Any]:
    """Verify Microsoft ID token and return user information.
    Token format: "id_token|access_token" (pipe-separated)
    """
    try:
        parts = token.split("|")
        id_token = parts[0]
        access_token = parts[1] if len(parts) > 1 else None

        unverified_header = jwt.get_unverified_headers(id_token)
        keys_response = requests.get("https://login.microsoftonline.com/common/discovery/v2.0/keys")
        keys_response.raise_for_status()
        keys = keys_response.json()["keys"]

        kid = unverified_header.get("kid")
        rsa_key = next((
            {
                "kty": k["kty"], 
                "kid": k["kid"], 
                "use": k["use"], 
                "n": k["n"], 
                "e": k["e"]
            } for k in keys if k["kid"] == kid
        ), None)

        if not rsa_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unable to find signing key")
        payload = jwt.decode(id_token, rsa_key, algorithms=["RS256"],
                           audience=settings.MICROSOFT_CLIENT_ID, options={"verify_exp": True})
        # picture url is not included in the id token, we need to fetch it separately from the Graph API
        picture_url = None
        if access_token:
            try:
                photo_response = requests.get(
                    "https://graph.microsoft.com/v1.0/me/photos/48x48/$value",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=5
                )
                if photo_response.status_code == 200:
                    import base64
                    picture_url = f"data:image/jpeg;base64,{base64.b64encode(photo_response.content).decode()}"
            except Exception:
                pass
        return {
            "sub": payload.get("sub") or payload.get("oid"),
            "email": payload.get("email") or payload.get("preferred_username"),
            "name": payload.get("name"),
            "given_name": payload.get("given_name"),
            "family_name": payload.get("family_name"),
            "picture": picture_url,
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Microsoft token has expired")
    except jwt.JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"invalid Microsoft token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"failed to verify Microsoft token: {str(e)}")