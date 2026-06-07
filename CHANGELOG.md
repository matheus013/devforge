# Changelog

## Unreleased

### Documentation

- Updated `docs/product-roadmap.md` with all new features and backlog: Phase 2 and 3 marked ✅ COMPLETE; Phase 4 (Subscriptions) expanded with change request limits, client finance portal, digital contracts, and Stripe; Phase 5 (Real Agents) expanded with health score and estimate-vs-reality; new Phase 5.5 (Notifications and Integrations) covering email, WhatsApp, webhooks, GitHub/GitLab, Slack, CLI, and API keys; new Phase 6.5 (Product Differentiation) covering project templates, white-label, public status page, mobile view, file attachments, weekly digest, and compliance audit reports; new Section 15 (Feature Backlog Summary) table with status and phase for every feature; updated Section 13 (Recommended Next Implementation Order) and Section 14 (Definition of Complete Product).

### Added

- `Project.has_database` boolean field (default `False`) — marks at design time whether the project requires a database. Shown as badge "DB" in the client project list, dashboard summary, and admin project monitor.
- `Deployment.admin_url` optional URL field — stores the admin panel URL of the client's deployed app (separate from the public web interface URL `url`). Shown as a "Painel admin →" link in the client delivery card when set. Admin sets it in the activation form.
- Admin deployment management: input field for `admin_url` when activating a deployment; admin_url and DB badge visible per deployment.
- 2 new migrations: `projects/0003`, `deployments/0004`.

- Phase 3 QA gates — `QAChecklist` model linked to each deployment with 3 auto-computed items (scope approved, roadmap complete, no blocking tickets) and 3 manual admin checks (URL reachable, client page reviewed, notes complete). `set_status` now blocks activation if the checklist is incomplete (HTTP 400 with checklist state).
- Phase 3 QA gates — `PATCH /api/deployments/{id}/qa-checklist/` lets admins toggle manual checklist items; `GET` returns auto-refreshed state.
- Phase 3 — `Ticket.client_visible` field (default `True`) with admin toggle in the Tickets section; marks which tickets are visible to the client.
- Phase 3 — `ProjectPlan.version` field (incremented on each `changes_requested` approval); plan version badge shown in the approval UI.
- Phase 3 — `POST /api/qa-checklists/` read endpoint registered for future bulk monitoring.
- 3 new database migrations: `projects/0002`, `tickets/0002`, `deployments/0003`.

- Phase 2 admin cockpit — team queue on Dashboard: shows projects waiting approval, pending agent runs, failed deployments, and high-priority tickets; each item links to the relevant project.
- Phase 2 admin cockpit — agent run monitor on "Agent Runs": filter by skill and status; expandable rows show full input/output JSON, logs, and token breakdown (in/out/total, source, cost); token ledger table shows cost and tokens per project.
- Phase 2 admin cockpit — deployment management on "Exportacoes": admin can activate or disable each deployment with a button (calls new `POST /api/deployments/{id}/set-status/` endpoint).
- Backend: `DeploymentViewSet.set_status` action — admin/staff can set deployment status to `ready`, `disabled`, or `failed` via `POST /api/deployments/{id}/set-status/`.
- Updated `docs/product-roadmap.md`: Phase 0 and Phase 1 marked as complete with delivered items.

- Sidebar navigation now works: clicking each item shows the corresponding section (Dashboard, Projetos, Mensagens, Tickets, Agent Runs, Exportacoes) with active highlight on the selected button.
- Client Dashboard section: summary cards (active projects, waiting approval, deployed) + project list with status labels, next-action text, and direct "Acessar →" deployment button. Clicking "Ver detalhes" navigates to the project in Projetos.
- Sections are now isolated: Mensagens is full-width messages; Tickets is full-width tickets; Agent Runs shows the agent panel + workforce; Exportacoes shows the import section; Projetos shows create form + list + detail.

- Client portal Phase 1: next-action banner per project tells the client exactly what to do next (highlighted in amber when urgent).
- Client portal Phase 1: client-friendly status labels throughout — "Aguardando sua aprovação", "Em produção", "Implantado", etc. (no more raw technical strings like `waiting_approval`).
- Client portal Phase 1: roadmap stages display human-readable labels ("A fazer", "Em andamento", "Concluído").
- Client portal Phase 1: approval flow now requires a comment when requesting changes or rejecting scope — inline textarea appears before the decision is submitted; "Aprovar" remains one click.
- Client portal Phase 1: prominent delivery card shows the deployment URL in teal with a direct "Acessar projeto →" button when the project is deployed.
- Client portal Phase 1: subscription stub card showing plan name, included services, and change request allowance.
- Client portal Phase 1: project timeline (Histórico de entregas) — chronological list of plan generation, approvals, agent updates, and deployment events.
- Backend: `ApprovalSerializer` now validates that `comment` is non-empty when `decision` is `changes_requested` or `rejected` (returns HTTP 400 with a field-level error).

### Changed

- Expanded `.gitignore` to cover Python artifacts (`*.egg-info`, `htmlcov`, `.coverage`, `celerybeat-schedule`), frontend build outputs (`out/`), logs (`*.log`), editor configs (`.vscode/`, `.idea/`), OS files (`Thumbs.db`), and secret file extensions (`*.pem`, `*.key`, `*.crt`, `*.p12`).

### Added

- Added Claude Code as a local agent runner option alongside Codex. The UI now shows a Codex / Claude Code selector in the "Acionar agente local" panel. Both runners create auditable `AgentRun` records and support the full handoff and resolve-project flows.
- Added `DEVFORGE_AGENT_RUNNER` env var (values: `codex` or `claude-code`) validated at startup — invalid values raise a `ValueError` on import.
- Added tests: `/request-agent/` with both runners, invalid runner rejection (400), and cross-tenant isolation (404 when targeting another org's project).
- Added `/api/agent-runs/request-agent/` endpoint accepting a `runner` field; the old `/request-codex/` endpoint is kept for backward compatibility.
- Added `active_runner` and `allowed_runners` fields to the `/api/agent-runs/registry/` response.

- Added client change-request chat behavior that refines unclear project changes into auditable operational prompts, questions, tickets, and `AgentRun` records.
- Added structured token accounting fields to `AgentRun` for future project-level usage dashboards.

### Changed

- Hardened `.claude/settings.json`: hook now uses `exit 2` (blocking) instead of `exit 1`, adds explicit detached-HEAD and missing-git guards, removes no-op PostToolUse hook, narrows `Bash(gh *)` to specific safe subcommands, and adds missing permissions for `npm`, `pytest`, `ruff`, and `docker`.
- Updated `CLAUDE.md`: added uncommitted-work guard before `git checkout main`, added merge step (step 8), fixed PR creation to use the template via `--body`, aligned step count with `docs/development-standard.md`.

### Documentation

- Added `CLAUDE.md` with the mandatory 9-step development workflow for Claude Code: branch → plan → implement → changelog → checks → PR → agent review → merge → report.
- Added `.claude/settings.json` with a `PreToolUse` hook that blocks `Edit`/`Write`/`NotebookEdit` tools when on the `main` branch or in a detached HEAD state.
- Added project-level token usage monitoring to the product roadmap.
- Added the DevForge AI development standard with mandatory branch, plan, changelog, PR, and agent-review workflow.
- Added a pull request template for product impact, technical impact, checks, token accounting, and agent reviewer notes.
- Added development workflow rules to `AGENTS.md`.
- Incorporated agent review feedback to make PR/review language mandatory and clarify token accounting for mocked and real provider runs.
- Incorporated agent review feedback for immutable project messages, tenant-scoped change requests, refined change tickets, and client-safe chat copy.
