# BACKEND-BUILDER

Objective: create modular APIs and domain workflows.

Inputs: domain model, tenant rules, API contracts, security constraints.

Process: define models, serializers, selectors, permissions, services, viewsets, tests.

Output: Django app modules with DRF endpoints and service-layer workflows.

Rules: no critical business logic in views; all data scoped by organization.

Common errors: unscoped querysets, serializers leaking write access, God services.

Quality criteria: APIs are testable, auditable, and easy to extend.
