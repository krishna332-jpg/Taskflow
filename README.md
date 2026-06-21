# TaskFlow         

[Live Demo](https://taskflow-neon-kappa.vercel.app)
An AI-powered project management platform built for teams. Create a project, describe it in plain text or upload a PDF brief, and AI generates a structured task breakdown automatically. Assign teammates to individual tasks using their personal invite code, track progress with real-time status updates, and collaborate in project-scoped chat — all backed by Google OAuth and a real-time notification system.

Built as a production-grade full-stack application with role-based permissions, persistent data, live deployment, and zero manual data entry required to get started.

---

## What it does

A user signs in with Google — no forms, no passwords. This automatically provisions a workspace and a unique 8-character invite code tied to their account. From there, they can create a project by giving it a name and either pasting a project brief or uploading a PDF spec. The backend extracts the text, sends it to the Claude API, and gets back a structured list of tasks — each with a title, description, and priority — which the user can reorder, edit, or discard before confirming.

Once a project exists, any task can be assigned to a teammate by entering that person's invite code. This automatically adds them to the project and the task appears on their personal dashboard immediately. Permissions are enforced at the API level: only the task's original creator (or the project owner) can edit its title or description, but any project member can update its status or mark it complete. Every meaningful action — being added to a project, having a task assigned, an edit to a task you're part of, a new chat message — generates a notification visible from a bell icon in the sidebar.

---

## Tech stack

**Frontend** — React 18, React Router, Recharts, @hello-pangea/dnd for drag-and-drop reordering, custom CSS with CSS variables and dark/light theming

**Backend** — FastAPI, SQLAlchemy ORM, JWT-based sessions, REST API with role-based access control

**Auth** — Google Identity Services (OAuth 2.0 redirect flow), accounts are created automatically on first sign-in

**AI** — Anthropic Claude API for task generation from free text or parsed PDF content

**Database** — SQLite via SQLAlchemy, with relational models for projects, memberships, task assignment, and notifications

**Deployment** — Vercel (frontend), Render (backend)

---

## Core features

- **Google-only authentication** — accounts are created transparently on first login, each with a unique invite code
- **AI task generation** — paste a project brief or upload a PDF, get back an editable, reorderable task list
- **Task assignment by code** — add a teammate to a specific task using their personal code; they're added to the project automatically and see it on their dashboard
- **Permission-aware editing** — task content can only be edited by its creator or the project owner; status and completion are open to all members
- **Drag-to-reorder** task lists with persisted ordering
- **Project-scoped chat** — each project has its own conversation, visible only to its members
- **Notification feed** — a bell icon surfaces additions, removals, edits, and chat activity in real time
- **Analytics dashboard** — task velocity, priority distribution, and per-project completion charts via Recharts
- **Join by code** — anyone with a project's invite code can request to join without being manually invited

---

## Architecture decisions worth noting

**Personal vs. project-wide stats** — Dashboard metrics (total tasks, urgent count, in-progress count) are scoped to tasks actually assigned to the logged-in user, not every task across every project they belong to. This keeps the dashboard meaningful for members who didn't create the project.

**Permission enforcement at the API layer, not just the UI** — Editing a task's title or description checks `created_by_id` against the requesting user server-side. The frontend hides the edit button for non-owners, but the backend rejects the request regardless of what the client sends.

**Invite codes instead of email invites** — Every user and every project gets a unique code on creation. Joining a project or assigning a task is a matter of pasting a code, which avoids building and maintaining an email delivery pipeline for a portfolio-scale project.

**AI input flexibility** — The task generation endpoint accepts either raw text or a PDF upload (parsed server-side with `pypdf`), normalizing both into the same prompt structure before calling Claude.

---

## Running locally

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Create a `.env` file:

```
SECRET_KEY=your_random_secret_string
ANTHROPIC_API_KEY=your_anthropic_key   # optional — falls back to template tasks if omitted
```

```bash
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
```

Create a `.env` file:

```
REACT_APP_API_URL=http://localhost:8000
```

```bash
npm start
```

---

## Deployment

The frontend is deployed on Vercel with a `vercel.json` rewrite rule for client-side routing. The backend is deployed on Render as a Python web service with `runtime.txt` pinning the Python version to avoid build issues with native dependencies.

Environment variables required on Render: `SECRET_KEY`, `ANTHROPIC_API_KEY` (optional)

Environment variable required on Vercel: `REACT_APP_API_URL`

Google OAuth requires the deployed frontend's exact origin and `/login` path to be registered as authorized JavaScript origins and redirect URIs in Google Cloud Console.

---

## Project structure

```
taskflow/
    backend/
        routers/
            auth.py
            projects.py
            tasks.py
            ai_router.py
            chat.py
            notifications_router.py
        database.py
        auth_utils.py
        notifications.py
        main.py
        requirements.txt
        runtime.txt
    frontend/
        public/
            index.html
        src/
            components/
                Layout.js
            hooks/
                useAuth.js
            pages/
                Login.js
                Dashboard.js
                Projects.js
                ProjectBoard.js
                Chat.js
                Analytics.js
            utils/
                api.js
            App.js
            index.css
        package.json
        vercel.json
```

---

Created by **Athul Krishna K S**

[Portfolio](https://athul-krishna-k-s.vercel.app/) · [LinkedIn](https://www.linkedin.com/in/athul-krishna-k-s-135a42338/) 
