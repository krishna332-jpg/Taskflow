from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db, Task, Project, ProjectMember, TaskAssignee, User
from auth_utils import get_current_user
from notifications import notify, notify_many
from database import NotificationType

router = APIRouter()

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    project_id: int
    ai_generated: Optional[bool] = False

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None
    order_index: Optional[int] = None

class ReorderRequest(BaseModel):
    task_ids: List[int]  # new order

class AssignRequest(BaseModel):
    invite_code: str

def task_to_dict(t: Task, db: Session):
    assignees = db.query(TaskAssignee).filter(TaskAssignee.task_id == t.id).all()
    assignee_list = []
    for a in assignees:
        u = db.query(User).filter(User.id == a.user_id).first()
        if u:
            assignee_list.append({"id": u.id, "full_name": u.full_name, "picture": u.picture})
    return {
        "id": t.id, "title": t.title, "description": t.description,
        "status": t.status, "priority": t.priority,
        "due_date": t.due_date, "project_id": t.project_id,
        "ai_generated": t.ai_generated, "completed": t.completed,
        "order_index": t.order_index, "created_by_id": t.created_by_id,
        "assignees": assignee_list,
        "created_at": t.created_at, "updated_at": t.updated_at,
    }

def check_project_access(db, project_id, user_id):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project: return None
    member = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id).first()
    if not member: return None
    return project

@router.get("/")
def get_tasks(project_id: Optional[int] = None, status: Optional[str] = None,
              db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if project_id:
        if not check_project_access(db, project_id, current_user.id):
            raise HTTPException(status_code=403, detail="Not a member of this project.")
        query = db.query(Task).filter(Task.project_id == project_id)
    else:
        member_project_ids = [m.project_id for m in db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()]
        query = db.query(Task).filter(Task.project_id.in_(member_project_ids)) if member_project_ids else db.query(Task).filter(Task.id == -1)
    if status:
        query = query.filter(Task.status == status)
    tasks = query.order_by(Task.order_index).all()
    return [task_to_dict(t, db) for t in tasks]

@router.post("/")
def create_task(req: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = check_project_access(db, req.project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=403, detail="Not a member of this project.")
    max_order = db.query(Task).filter(Task.project_id == req.project_id).count()
    task = Task(
        title=req.title, description=req.description, status=req.status, priority=req.priority,
        due_date=req.due_date, project_id=req.project_id, ai_generated=req.ai_generated,
        created_by_id=current_user.id, order_index=max_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task, db)

@router.post("/bulk")
def create_tasks_bulk(tasks: List[TaskCreate], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not tasks: return []
    project = check_project_access(db, tasks[0].project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=403, detail="Not a member of this project.")
    start_order = db.query(Task).filter(Task.project_id == tasks[0].project_id).count()
    created = []
    for i, req in enumerate(tasks):
        task = Task(
            title=req.title, description=req.description, status=req.status, priority=req.priority,
            due_date=req.due_date, project_id=req.project_id, ai_generated=req.ai_generated,
            created_by_id=current_user.id, order_index=start_order + i,
        )
        db.add(task)
        created.append(task)
    db.commit()
    for t in created: db.refresh(t)
    return [task_to_dict(t, db) for t in created]

@router.put("/{task_id}")
def update_task(task_id: int, req: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not check_project_access(db, task.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this project.")

    # Only the task creator (or project owner) may edit title/description; anyone on the project can change status/progress
    is_owner_or_creator = (task.created_by_id == current_user.id) or \
        (db.query(Project).filter(Project.id == task.project_id, Project.owner_id == current_user.id).first() is not None)
    editing_content = req.title is not None or req.description is not None
    if editing_content and not is_owner_or_creator:
        raise HTTPException(status_code=403, detail="Only the task creator can edit its title or description.")

    if req.title is not None: task.title = req.title
    if req.description is not None: task.description = req.description
    if req.status is not None: task.status = req.status
    if req.priority is not None: task.priority = req.priority
    if req.due_date is not None: task.due_date = req.due_date
    if req.completed is not None:
        task.completed = req.completed
        if req.completed: task.status = "done"
    if req.order_index is not None: task.order_index = req.order_index
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    if editing_content:
        members = db.query(ProjectMember).filter(ProjectMember.project_id == task.project_id).all()
        notify_many(db, [m.user_id for m in members], NotificationType.TASK_EDITED,
                    f"\"{task.title}\" was updated", task.project_id, exclude_id=current_user.id)
    return task_to_dict(task, db)

@router.post("/reorder")
def reorder_tasks(req: ReorderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for idx, tid in enumerate(req.task_ids):
        task = db.query(Task).filter(Task.id == tid).first()
        if task and check_project_access(db, task.project_id, current_user.id):
            task.order_index = idx
    db.commit()
    return {"message": "Reordered"}

@router.post("/{task_id}/assign")
def assign_member(task_id: int, req: AssignRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not check_project_access(db, task.project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this project.")
    target_user = db.query(User).filter(User.invite_code == req.invite_code.upper().strip()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="No user found with that code.")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    member = db.query(ProjectMember).filter(ProjectMember.project_id == task.project_id, ProjectMember.user_id == target_user.id).first()
    if not member:
        member = ProjectMember(project_id=task.project_id, user_id=target_user.id, role="member")
        db.add(member)
        db.commit()
        notify(db, target_user.id, NotificationType.MEMBER_ADDED, f"You were added to \"{project.name}\"", task.project_id)

    existing = db.query(TaskAssignee).filter(TaskAssignee.task_id == task_id, TaskAssignee.user_id == target_user.id).first()
    if not existing:
        db.add(TaskAssignee(task_id=task_id, user_id=target_user.id))
        db.commit()
        notify(db, target_user.id, NotificationType.TASK_ASSIGNED, f"You were assigned to \"{task.title}\" in \"{project.name}\"", task.project_id)
    return task_to_dict(task, db)

@router.delete("/{task_id}/assign/{user_id}")
def unassign_member(task_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(TaskAssignee).filter(TaskAssignee.task_id == task_id, TaskAssignee.user_id == user_id).first()
    if a:
        db.delete(a)
        db.commit()
    return {"message": "Unassigned"}

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    is_owner_or_creator = (task.created_by_id == current_user.id) or \
        (db.query(Project).filter(Project.id == task.project_id, Project.owner_id == current_user.id).first() is not None)
    if not is_owner_or_creator:
        raise HTTPException(status_code=403, detail="Only the task creator or project owner can delete this task.")
    db.delete(task)
    db.commit()
    return {"message": "Deleted"}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Personal dashboard stats: tasks assigned to me, OR tasks I created that have no assignee yet
    assigned_task_ids = [a.task_id for a in db.query(TaskAssignee).filter(TaskAssignee.user_id == current_user.id).all()]
    created_unassigned_ids = [
        t.id for t in db.query(Task).filter(Task.created_by_id == current_user.id).all()
        if not db.query(TaskAssignee).filter(TaskAssignee.task_id == t.id).first()
    ]
    my_task_ids = list(set(assigned_task_ids + created_unassigned_ids))
    if not my_task_ids:
        return {"total": 0, "done": 0, "in_progress": 0, "todo": 0, "urgent": 0}
    base = db.query(Task).filter(Task.id.in_(my_task_ids))
    return {
        "total": base.count(),
        "done": base.filter(Task.completed == True).count(),
        "in_progress": base.filter(Task.status == "in_progress").count(),
        "todo": base.filter(Task.status == "todo").count(),
        "urgent": base.filter(Task.priority == "urgent").count(),
    }