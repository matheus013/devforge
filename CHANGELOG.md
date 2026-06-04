# Changelog

## Unreleased

### Changed

- Expanded `.gitignore` to cover Python artifacts (`*.egg-info`, `htmlcov`, `.coverage`, `celerybeat-schedule`), frontend build outputs (`out/`), logs (`*.log`), editor configs (`.vscode/`, `.idea/`), OS files (`Thumbs.db`), and secret file extensions (`*.pem`, `*.key`, `*.crt`, `*.p12`).

### Added

- Added client change-request chat behavior that refines unclear project changes into auditable operational prompts, questions, tickets, and `AgentRun` records.
- Added structured token accounting fields to `AgentRun` for future project-level usage dashboards.

### Documentation

- Added project-level token usage monitoring to the product roadmap.
- Added the DevForge AI development standard with mandatory branch, plan, changelog, PR, and agent-review workflow.
- Added a pull request template for product impact, technical impact, checks, token accounting, and agent reviewer notes.
- Added development workflow rules to `AGENTS.md`.
- Incorporated agent review feedback to make PR/review language mandatory and clarify token accounting for mocked and real provider runs.
- Incorporated agent review feedback for immutable project messages, tenant-scoped change requests, refined change tickets, and client-safe chat copy.
