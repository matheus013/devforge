# Changelog

## Unreleased

### Added

- Added Claude Code as a local agent runner option alongside Codex. The UI now shows a Codex / Claude Code selector in the "Acionar agente local" panel. Both runners create auditable `AgentRun` records and support the full handoff and resolve-project flows.
- Added `DEVFORGE_AGENT_RUNNER` env var (values: `codex` or `claude-code`) validated at startup — the app rejects any other value.
- Added `/api/agent-runs/request-agent/` endpoint accepting a `runner` field; the old `/request-codex/` endpoint is kept for backward compatibility.
- Added `active_runner` and `allowed_runners` fields to the `/api/agent-runs/registry/` response.

- Added client change-request chat behavior that refines unclear project changes into auditable operational prompts, questions, tickets, and `AgentRun` records.
- Added structured token accounting fields to `AgentRun` for future project-level usage dashboards.

### Documentation

- Added project-level token usage monitoring to the product roadmap.
- Added the DevForge AI development standard with mandatory branch, plan, changelog, PR, and agent-review workflow.
- Added a pull request template for product impact, technical impact, checks, token accounting, and agent reviewer notes.
- Added development workflow rules to `AGENTS.md`.
- Incorporated agent review feedback to make PR/review language mandatory and clarify token accounting for mocked and real provider runs.
- Incorporated agent review feedback for immutable project messages, tenant-scoped change requests, refined change tickets, and client-safe chat copy.
