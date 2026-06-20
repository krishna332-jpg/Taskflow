from sqlalchemy.orm import Session
from database import Notification, NotificationType

def notify(db: Session, user_id: int, ntype: NotificationType, message: str, project_id: int = None):
    n = Notification(user_id=user_id, type=ntype, message=message, project_id=project_id)
    db.add(n)
    db.commit()
    return n

def notify_many(db: Session, user_ids: list, ntype: NotificationType, message: str, project_id: int = None, exclude_id: int = None):
    for uid in user_ids:
        if uid == exclude_id:
            continue
        notify(db, uid, ntype, message, project_id)
