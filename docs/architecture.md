# Architecture

DevForge AI uses a monorepo with separate backend, frontend, agent skill, and template directories.

The backend domain is organized around accounts, organizations, projects, approvals, agents, tickets, imports, exports, deployments, billing, and audit. Organization membership is the core tenant boundary.

The first MVP keeps AI behavior mocked through Python services:

- `project-planner` creates a structured plan.
- `complexity-classifier` determines risk and ticket needs.
- `import-analyzer` inspects source metadata without execution.
- `ticket-triage` opens tickets from risk signals.
- `pricing-estimator` produces deterministic price estimates.

Future versions can route these service calls through Celery workers and real model providers while preserving the API and audit model.
