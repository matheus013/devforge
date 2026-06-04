# CLAUDE.md — DevForge AI

## Mandatory Development Workflow

Every implementation task follows this exact sequence. No exceptions.

### 1. Create a branch first

Before touching any file, check for uncommitted work and create a branch:

```bash
# Check for uncommitted user work first — do NOT proceed if the tree is dirty
git status --short --branch

# Only if the tree is clean:
git checkout main
git pull origin main 2>/dev/null || echo "sem remote configurado — usando main local"
git checkout -b <branch-name>
```

**If the working tree is dirty**, do not run `git checkout main`. Work around the uncommitted changes or ask for guidance — see `docs/development-standard.md` §3.

Branch naming:
- `codex/<short-feature-name>` — new features
- `codex/fix-<short-bug-name>` — bug fixes
- `codex/docs-<short-topic>` — documentation only
- `codex/refactor-<short-area>` — refactors

Never commit directly to `main`.

### 2. Write a development plan

Before editing any file, write a short plan in the conversation:

- Goal
- Files likely to change (backend / frontend / migrations)
- Risks or assumptions
- Checks to run

### 3. Implement

Follow the standards in `AGENTS.md` and `docs/development-standard.md`.

### 4. Update CHANGELOG.md

Every meaningful change must add an entry under `## Unreleased` in `CHANGELOG.md`.

Format:
```md
### Added / Changed / Fixed / Documentation
- <user-facing description>
```

### 5. Run checks

```bash
cd backend && USE_SQLITE=1 pytest
cd backend && ruff check .
cd frontend && npm run typecheck
```

Document failures if they block the task.

### 6. Commit and open a PR

```bash
git add <specific files>
git commit -m "<type>: <short description>"
git push -u origin <branch-name>

# Use the PR template — cat it and pass as body:
gh pr create --title "..." --body "$(cat .github/pull_request_template.md)"
```

Fill all sections of the template before submitting.

### 7. Agent review

After opening the PR, spawn a `code-review` agent to review it:

```
/code-review ultra <PR-number>
```

Address any blocking findings before merging.

### 8. Merge after review is accepted

```bash
gh pr merge <PR-number> --squash --delete-branch
```

Only merge after the agent review is accepted and no blocking findings remain.

### 9. Report completion

Return to the user:
- PR URL
- Summary of what changed
- Any known limitations or deferred items

## References

- Full workflow: `docs/development-standard.md`
- Project rules: `AGENTS.md`
- PR template: `.github/pull_request_template.md`
- Changelog: `CHANGELOG.md`
