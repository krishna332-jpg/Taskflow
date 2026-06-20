# TaskFlow — AI-Powered Project Management

> A full-stack project management tool with AI task generation, drag-and-drop Kanban boards, real-time statistics, and a refined editorial design.

![Stack](https://img.shields.io/badge/Frontend-React%2018-blue)
![Stack](https://img.shields.io/badge/Backend-FastAPI-green)
![Stack](https://img.shields.io/badge/AI-Claude%20API-orange)
![Stack](https://img.shields.io/badge/Deploy-Free-brightgreen)

---

## ✨ Features

- **Authentication** — JWT-based signup/login
- **Project Management** — Create, colour-code, and track projects
- **Kanban Board** — Drag-and-drop tasks across To Do / In Progress / In Review / Done
- **AI Task Generation** — Claude AI auto-generates a task breakdown from your project description
- **AI Priority Suggestions** — AI recommends priority levels for tasks
- **Dashboard Analytics** — Bar charts and pie charts via Recharts
- **Responsive Design** — Elegant serif typography (Playfair Display + EB Garamond)

---

## 🗂️ Project Structure

```
taskflow/
├── backend/               # FastAPI Python backend
│   ├── main.py            # App entry point
│   ├── database.py        # SQLAlchemy models (SQLite)
│   ├── auth_utils.py      # JWT auth helpers
│   ├── routers/
│   │   ├── auth.py        # /api/auth
│   │   ├── projects.py    # /api/projects
│   │   ├── tasks.py       # /api/tasks
│   │   └── ai_router.py   # /api/ai
│   ├── tests/
│   │   └── test_api.py    # Pytest test suite
│   ├── requirements.txt
│   └── render.yaml        # Render deployment config
│
└── frontend/              # React frontend
    ├── src/
    │   ├── App.js
    │   ├── index.css       # Design system + animations
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── Projects.js
    │   │   └── ProjectBoard.js   # Kanban
    │   ├── components/
    │   │   └── Layout.js         # Sidebar nav
    │   ├── hooks/
    │   │   └── useAuth.js        # Auth context
    │   └── utils/
    │       └── api.js            # Axios API client
    ├── package.json
    └── vercel.json
```

---

## 🚀 Local Development

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/taskflow.git
cd taskflow
```

### 2. Run the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Edit if needed
uvicorn main:app --reload
```
Backend runs at **http://localhost:8000**
API docs at **http://localhost:8000/docs**

### 3. Run the Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm start
```
Frontend runs at **http://localhost:3000**

### 4. Run Tests
```bash
# Backend tests
cd backend
pytest tests/test_api.py -v

# Frontend tests
cd frontend
npm test
```

---

## 🌍 Free Deployment (Step-by-Step)

### Backend → Render (Free)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `SECRET_KEY` → any random string
   - `ANTHROPIC_API_KEY` → your key (optional, works without it)
6. Click **Deploy** — free tier, no credit card needed!

### Frontend → Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Create React App
4. Add environment variable:
   - `REACT_APP_API_URL` → your Render backend URL (e.g. `https://taskflow-api.onrender.com`)
5. Click **Deploy** — live in 60 seconds!

---

## 🔑 AI Feature Setup

The AI features work **without an API key** (returns mock tasks).

To enable real AI:
1. Get a free Anthropic API key at [console.anthropic.com](https://console.anthropic.com)
2. Add `ANTHROPIC_API_KEY=sk-ant-...` to your Render environment variables

---

## 🧪 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Recharts, @hello-pangea/dnd |
| Backend | FastAPI, SQLAlchemy, SQLite, python-jose |
| AI | Anthropic Claude API (claude-3-haiku) |
| Auth | JWT (Bearer tokens) |
| Tests | Pytest + React Testing Library |
| Deploy | Vercel (frontend) + Render (backend) — both free |
| Fonts | Playfair Display, EB Garamond, DM Mono |

---

## 🎨 Design System

- **Typography**: Playfair Display (headings) + EB Garamond (body) — editorial serif
- **Palette**: Warm cream, aged parchment, ink black, antique gold, sage green
- **Animations**: CSS keyframes — fadeUp, float, shimmer, pulse
- **Interactions**: Hover lift on cards, gold glow on focus inputs, ink-drop ripple

---

## 📋 API Endpoints

```
POST   /api/auth/register      Register user
POST   /api/auth/login         Login (returns JWT)

GET    /api/projects/          List projects
POST   /api/projects/          Create project
PUT    /api/projects/:id       Update project
DELETE /api/projects/:id       Delete project

GET    /api/tasks/             List tasks (filter by project_id, status)
POST   /api/tasks/             Create task
PUT    /api/tasks/:id          Update task (status, priority, etc.)
DELETE /api/tasks/:id          Delete task
GET    /api/tasks/stats        Task statistics

POST   /api/ai/generate-tasks      AI task generation
POST   /api/ai/suggest-priority    AI priority suggestion
```

---

## 🏆 Resume Points

- Built a full-stack web app with React + FastAPI from scratch
- Implemented JWT authentication with secure password hashing (bcrypt)
- Integrated Claude AI API for intelligent task generation
- Built drag-and-drop Kanban board using @hello-pangea/dnd
- Created RESTful API with OpenAPI documentation
- Wrote 15+ automated tests (Pytest + React Testing Library)
- Deployed to cloud infrastructure (Vercel + Render) with CI/CD via GitHub
- Designed a custom design system with CSS variables and animations

---

*Built with care. Deployed for free.*
