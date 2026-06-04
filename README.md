# DevForge AI

DevForge AI is a first functional prototype for a SaaS platform that behaves like an operating system for automated software houses. It is intentionally not a chatbot or a plain CRUD app. The MVP focuses on tenant isolation, project planning, approvals, visual roadmap, tickets, imports, assessments, export requests, and auditable mocked agent runs.

## Stack

- Backend: Python 3.12, Django, Django REST Framework, Simple JWT, PostgreSQL, Celery, Redis, pytest, Ruff.
- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn-style components, TanStack Query, React Hook Form, Zod.
- Infra: Docker Compose, PostgreSQL, Redis, MinIO, Gitea, backend, celery, frontend.

## Local Setup

Recommended helper script:

```bash
./devforge.sh install-docker
./devforge.sh start
```

For MacBooks with little free storage, the script warns when disk space is low,
uses Docker log rotation, and includes cleanup commands:

```bash
./devforge.sh status
./devforge.sh clean
```

Use `./devforge.sh clean --volumes` only when you want to delete local project
data stored in Docker volumes.

Manual Compose command:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django admin: http://localhost:8000/admin/
- MinIO console: http://localhost:9001
- Gitea: http://localhost:3001

Seeded users:

- `admin@devforge.local` / `devforge123`
- `client@devforge.local` / `devforge123`
- `client2@devforge.local` / `devforge123`
- `operator@devforge.local` / `devforge123`

Local agent registry:

- `GET /api/agent-runs/registry/` lists the deterministic local agents configured for tests.
- Agent runs are always stored in `AgentRun` and scoped by organization.
- Current local provider defaults to `local-codex` with `DEVFORGE_AGENT_MODE=mock`.

## API Surface

- `/api/auth/register/`
- `/api/auth/token/`
- `/api/projects/`
- `/api/messages/`
- `/api/plans/`
- `/api/approvals/`
- `/api/stages/`
- `/api/tickets/`
- `/api/imports/`
- `/api/assessments/`
- `/api/exports/`
- `/api/agent-runs/`

## Architecture

The backend is split by bounded modules under `backend/apps/`. Critical business behavior lives in services, not views. Querysets are scoped through organization selectors so client users only see their own organization data.

The agent layer is mocked but shaped for replacement by real orchestration. Current services generate project plans, classify complexity, analyze imports without execution, estimate pricing, and triage tickets.

## Useful Commands

```bash
cd backend
USE_SQLITE=1 python manage.py makemigrations --noinput
USE_SQLITE=1 python manage.py migrate --run-syncdb
USE_SQLITE=1 python manage.py seed_demo
USE_SQLITE=1 pytest
ruff check .
```

```bash
cd frontend
npm install
npm run dev
npm run typecheck
```

## Next Steps

- Add generated migrations once the domain stabilizes.
- Connect frontend forms to authenticated API calls.
- Add object-level permission classes to every write path.
- Add MinIO-backed ZIP upload handling.
- Replace mocked agent services with queue-backed orchestrations.
- Add billing, deployment records, and export packaging.
