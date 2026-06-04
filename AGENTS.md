# AGENTS.md

## Vision

DevForge AI is an operating system for automated software houses. Agents should help transform briefs and imported repositories into structured plans, roadmaps, tickets, assessments, and exportable code packages. The MVP must remain modular, auditable, and ready for real orchestration later.

## Mandatory Rules

- Never build this as a chatbot-first product.
- Never execute imported code in the MVP.
- Never hardcode production secrets.
- Never expose data across organizations.
- Keep critical logic out of Django views.
- Every agent execution must be represented by an `AgentRun`.
- Every important decision should be traceable to a project and organization.
- Track token usage by project for every AI/agent execution. Use real provider token data when available; otherwise store estimated or zero usage with an explicit estimated/unavailable marker.

## Development Workflow

- Always create a new branch before implementation work.
- Write a short development plan before editing code or product documentation.
- Keep changes scoped to the task and preserve unrelated user work.
- Update `CHANGELOG.md` for every meaningful change.
- Open a pull request when a Git remote exists.
- Ask another agent to review the pull request before merge.
- If a PR cannot be opened because the repository has no commits or remote, report that explicitly.
- Follow the full workflow in `docs/development-standard.md`.

## Backend Standards

- Use Django REST Framework ViewSets.
- Keep serializers, services, selectors, and permissions separate.
- Scope querysets by `organization_id`.
- Use typed service functions and small models.
- Prefer transactions around workflows that create several records.
- Keep mocked AI deterministic and easy to replace.
- Add tests for tenant isolation, lifecycle transitions, and generated records.

## Frontend Standards

- Use Next.js, TypeScript, Tailwind, TanStack Query, React Hook Form, and Zod.
- Keep components small and reusable.
- Provide loading, error, and empty states for real API screens.
- Use status badges, timelines, tables, and dense SaaS layouts.
- Avoid marketing pages for product workflows.
- Keep the first screen useful for operators and clients.

## Definition of Done

- A client can create a project.
- A simulated project plan is generated.
- A client can approve, reject, or request changes.
- Roadmap stages exist and are visible.
- Imports generate an assessment without executing code.
- Complex/imported projects can generate tickets.
- Admins can inspect projects, tickets, assessments, exports, and agent runs.
- Admins can inspect token usage and estimated cost per project for AI/agent runs.
- Docker Compose can start all required services.
- Tests cover the riskiest workflow paths.

## Commands

```bash
docker compose up --build
cd backend && USE_SQLITE=1 pytest
cd backend && ruff check .
cd frontend && npm run typecheck
```
