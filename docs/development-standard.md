# DevForge AI Development Standard

## 1. Purpose

This standard defines how every future change should be planned, implemented, documented, reviewed, and shipped. The goal is to keep DevForge AI auditable, modular, and safe as the product grows into a multi-client, multi-agent software delivery platform.

## 2. Mandatory Workflow

Every meaningful change must follow this sequence:

1. Create a new branch.
2. Write a short development plan.
3. Implement the change.
4. Update the changelog.
5. Run relevant checks.
6. Open a pull request.
7. Ask another agent to review the pull request.
8. Address review findings.
9. Merge only after review is accepted.

Small exploratory commands do not require a branch, but any code, schema, documentation, workflow, or product behavior change does.

## 3. Branch Policy

Agents must never work directly on `main` for implementation work.

Branch naming:

- `codex/<short-feature-name>` for normal implementation.
- `codex/docs-<short-topic>` for documentation-only updates.
- `codex/fix-<short-bug-name>` for bug fixes.
- `codex/refactor-<short-area>` for refactors.

Examples:

- `codex/token-usage-dashboard`
- `codex/docs-development-standard`
- `codex/fix-admin-login-error`

Before creating a branch, check:

```bash
git status --short --branch
git branch --show-current
```

If the repository has uncommitted user work, do not revert it. Work around it or ask for guidance only if the change makes the task impossible.

## 4. Development Plan

Before implementation, the agent must write a concise plan in the conversation or task context.

The plan should include:

- Goal.
- Files or modules likely to change.
- Backend impact.
- Frontend impact.
- Data/migration impact.
- Tests/checks to run.
- Risks or assumptions.

For larger changes, keep the plan updated as work progresses.

## 5. Implementation Rules

Implementation must follow the project standards:

- Keep business logic out of Django views.
- Use services, selectors, serializers, permissions, and ViewSets.
- Scope data by organization.
- Preserve tenant isolation.
- Keep frontend screens dense, useful, and workflow-oriented.
- Avoid chatbot-first UX.
- Do not execute imported code in the MVP.
- Do not hardcode production secrets.
- Create or update tests for risky paths.
- Keep changes tightly scoped.

## 6. Changelog Policy

Every change must update `CHANGELOG.md`.

Use the `Unreleased` section until a version is cut.

Format:

```md
## Unreleased

### Added

- Added ...

### Changed

- Changed ...

### Fixed

- Fixed ...

### Documentation

- Documented ...
```

Changelog entries should be user-facing or operator-facing. Avoid listing every internal line edit.

## 7. Pull Request Policy

Every branch must become a pull request before merge when a Git remote exists.

The PR description must include:

- Summary.
- Product impact.
- Admin impact.
- Client impact.
- Data/migration impact.
- Tests run.
- Screenshots or URLs for frontend work.
- Known limitations.

If no remote is configured, the agent must say that a real PR cannot be opened yet and provide the exact branch name and validation results.

## 8. Review By Another Agent

Before merge, another agent must review the PR.

The review should focus on:

- Tenant isolation.
- Security and secrets.
- Data leakage across organizations.
- AgentRun auditability.
- Token/cost accounting when AI execution is involved.
- Lifecycle transitions.
- Frontend usability.
- Missing loading/error/empty states.
- Tests and migration safety.

The implementing agent should address review findings before merge.

## 9. Token Usage Requirements

Any feature that triggers AI, agents, orchestration, code generation, assessment, planning, or deployment assistance must consider token accounting.

New agent-related work should define:

- Where input tokens are stored.
- Where output tokens are stored.
- How total tokens are computed.
- How estimated cost is computed.
- How usage is linked to project and organization.
- How admin can inspect the usage.
- What budget or alert behavior is needed.

`AgentRun` is the primary audit record for token usage.

## 10. Required Checks

Run checks that match the change.

Backend:

```bash
cd backend && USE_SQLITE=1 pytest
cd backend && ruff check .
```

Frontend:

```bash
cd frontend && npm run typecheck
```

Docker:

```bash
docker compose up --build
```

For frontend changes, verify the screen in the browser whenever practical.

## 11. Definition Of Done

A change is done only when:

- It was developed on a branch.
- The implementation matches the plan or deviations are explained.
- The changelog is updated.
- Relevant checks pass or failures are documented.
- A PR is opened when a remote exists.
- Another agent has reviewed the PR, or the lack of PR infrastructure is clearly documented.
- The user receives the final URL, command, or result needed to test the change.
