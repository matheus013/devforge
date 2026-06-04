# Changelog

## Unreleased

### Added

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
