from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import anthropic, os, json, io

router = APIRouter()

def get_ai_tasks_from_text(project_name: str, content: str):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return [
            {"title": "Set up project structure", "description": "Initialize the repository and folder structure", "priority": "high"},
            {"title": "Design core layout", "description": "Create the main UI layout and navigation", "priority": "high"},
            {"title": "Build primary features", "description": "Implement the core functionality described", "priority": "medium"},
            {"title": "Add content and styling", "description": "Polish the visual design and content", "priority": "medium"},
            {"title": "Test and review", "description": "Test all features and fix any issues", "priority": "medium"},
            {"title": "Deploy and launch", "description": "Deploy to production and announce", "priority": "low"},
        ]
    client = anthropic.Anthropic(api_key=api_key)
    prompt = f"""You are a project planning AI. Based on the project name and description/content below, generate a practical task breakdown.

Project name: {project_name}
Content / description:
{content[:6000]}

Respond ONLY with valid JSON, no other text, in this exact format:
{{"tasks": [{{"title": "Short task heading", "description": "One sentence on exactly what to do", "priority": "high|medium|low"}}, ...]}}

Generate 6-10 tasks that are specific and actionable based on the actual content provided."""
    message = client.messages.create(model="claude-3-haiku-20240307", max_tokens=1500, messages=[{"role": "user", "content": prompt}])
    text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(text)
        return data.get("tasks", [])
    except Exception:
        raise HTTPException(status_code=500, detail="AI response could not be parsed")

class AIGenerateRequest(BaseModel):
    project_name: str
    project_description: str = ""

@router.post("/generate-tasks")
def generate_tasks(req: AIGenerateRequest):
    tasks = get_ai_tasks_from_text(req.project_name, req.project_description)
    return {"tasks": tasks}

@router.post("/generate-from-file")
async def generate_from_file(project_name: str = Form(...), file: UploadFile = File(...)):
    content = ""
    if file.filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(await file.read()))
            content = "\n".join([page.extract_text() or "" for page in reader.pages])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    else:
        raw = await file.read()
        content = raw.decode("utf-8", errors="ignore")
    if not content.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the uploaded file.")
    tasks = get_ai_tasks_from_text(project_name, content)
    return {"tasks": tasks}
