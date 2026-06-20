from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, ChatMessage, Project, ProjectMember, User
from auth_utils import get_current_user
from notifications import notify_many
from database import NotificationType

router = APIRouter()

class MessageCreate(BaseModel):
    project_id: int
    text: str

def check_access(db, project_id, user_id):
    return db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id).first()

def msg_to_dict(m: ChatMessage, db: Session):
    u = db.query(User).filter(User.id == m.user_id).first()
    return {
        "id": m.id, "project_id": m.project_id, "text": m.text, "created_at": m.created_at,
        "user": {"id": u.id, "full_name": u.full_name, "picture": u.picture} if u else None,
    }

@router.get("/{project_id}")
def get_messages(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not check_access(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this project.")
    msgs = db.query(ChatMessage).filter(ChatMessage.project_id == project_id).order_by(ChatMessage.created_at).all()
    return [msg_to_dict(m, db) for m in msgs]

@router.post("/")
def send_message(req: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not check_access(db, req.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this project.")
    msg = ChatMessage(project_id=req.project_id, user_id=current_user.id, text=req.text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    project = db.query(Project).filter(Project.id == req.project_id).first()
    members = db.query(ProjectMember).filter(ProjectMember.project_id == req.project_id).all()
    notify_many(db, [m.user_id for m in members], NotificationType.CHAT_MESSAGE,
                f"{current_user.full_name} sent a message in \"{project.name}\"", req.project_id, exclude_id=current_user.id)
    return msg_to_dict(msg, db)
