from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, User
from auth_utils import create_access_token, generate_invite_code, get_current_user

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    email: str
    full_name: str = ""
    google_id: str = ""
    picture: str = ""

def user_to_dict(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "picture": user.picture,
        "invite_code": user.invite_code,
    }

@router.post("/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        username = req.email.split("@")[0]
        base_username = username
        i = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{i}"
            i += 1
        code = generate_invite_code()
        while db.query(User).filter(User.invite_code == code).first():
            code = generate_invite_code()
        user = User(
            email=req.email,
            username=username,
            full_name=req.full_name or username,
            picture=req.picture,
            google_id=req.google_id,
            invite_code=code,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Keep profile data fresh
        if req.full_name: user.full_name = req.full_name
        if req.picture: user.picture = req.picture
        if not user.invite_code:
            code = generate_invite_code()
            while db.query(User).filter(User.invite_code == code).first():
                code = generate_invite_code()
            user.invite_code = code
        db.commit()

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)
