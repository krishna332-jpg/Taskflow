from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, Project, Task, ProjectMember, User
from auth_utils import get_current_user, generate_invite_code
from notifications import notify, notify_many
from database import NotificationType

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#ff5722"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class JoinRequest(BaseModel):
    code: str

def project_to_dict(p: Project, db: Session):
    task_count = db.query(Task).filter(Task.project_id == p.id).count()
    done_count = db.query(Task).filter(Task.project_id == p.id, Task.completed == True).count()
    members = db.query(ProjectMember).filter(ProjectMember.project_id == p.id).all()
    return {
        "id": p.id, "name": p.name, "description": p.description,
        "color": p.color, "invite_code": p.invite_code,
        "task_count": task_count, "done_count": done_count,
        "owner_id": p.owner_id,
        "member_count": len(members),
        "created_at": p.created_at,
    }

def get_user_project_ids(db: Session, user_id: int):
    owned = [p.id for p in db.query(Project).filter(Project.owner_id == user_id).all()]
    member_of = [m.project_id for m in db.query(ProjectMember).filter(ProjectMember.user_id == user_id).all()]
    return list(set(owned + member_of))

@router.get("/")
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ids = get_user_project_ids(db, current_user.id)
    projects = db.query(Project).filter(Project.id.in_(ids)).all() if ids else []
    return [project_to_dict(p, db) for p in projects]

@router.post("/")
def create_project(req: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = generate_invite_code()
    while db.query(Project).filter(Project.invite_code == code).first():
        code = generate_invite_code()
    project = Project(name=req.name, description=req.description, color=req.color, owner_id=current_user.id, invite_code=code)
    db.add(project)
    db.commit()
    db.refresh(project)
    member = ProjectMember(project_id=project.id, user_id=current_user.id, role="owner")
    db.add(member)
    db.commit()
    return project_to_dict(project, db)

@router.post("/join")
def join_project(req: JoinRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.invite_code == req.code.upper().strip()).first()
    if not project:
        raise HTTPException(status_code=404, detail="No project found with that code.")
    existing = db.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You're already a member of this project.")
    member = ProjectMember(project_id=project.id, user_id=current_user.id, role="member")
    db.add(member)
    db.commit()
    # notify owner and existing members
    other_members = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).all()
    notify_many(db, [m.user_id for m in other_members], NotificationType.MEMBER_ADDED,
                f"{current_user.full_name} joined \"{project.name}\"", project.id, exclude_id=current_user.id)
    return project_to_dict(project, db)

@router.get("/{project_id}/members")
def get_members(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append({"id": u.id, "full_name": u.full_name, "username": u.username, "email": u.email, "picture": u.picture, "role": m.role})
    return result

@router.delete("/{project_id}/members/{user_id}")
def remove_member(project_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can remove members.")
    member = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id).first()
    if member:
        removed_user = db.query(User).filter(User.id == user_id).first()
        db.delete(member)
        db.commit()
        if removed_user:
            notify(db, user_id, NotificationType.MEMBER_REMOVED, f"You were removed from \"{project.name}\"", project_id)
    return {"message": "Removed"}

@router.put("/{project_id}")
def update_project(project_id: int, req: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or you're not the owner.")
    if req.name: project.name = req.name
    if req.description is not None: project.description = req.description
    if req.color: project.color = req.color
    db.commit()
    db.refresh(project)
    return project_to_dict(project, db)

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or you're not the owner.")
    db.delete(project)
    db.commit()
    return {"message": "Deleted"}
