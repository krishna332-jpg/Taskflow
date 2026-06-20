from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Notification, User
from auth_utils import get_current_user

router = APIRouter()

def notif_to_dict(n: Notification):
    return {"id": n.id, "type": n.type, "message": n.message, "project_id": n.project_id, "is_read": n.is_read, "created_at": n.created_at}

@router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [notif_to_dict(n) for n in notifs]

@router.post("/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "ok"}

@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "ok"}
