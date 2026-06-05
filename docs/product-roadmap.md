# DevForge AI Product Roadmap

## 1. Product Vision

DevForge AI is an operating system for automated software houses. The product helps a software provider receive client briefs, transform them into structured delivery plans, run auditable agents, manage approvals, generate tickets, publish deployments, and keep the client inside a subscription-based delivery experience.

The product should not be positioned as a chatbot. The core promise is:

> A client buys a project plus implementation subscription. DevForge turns that engagement into an auditable production workflow, from brief to deployed URL.

The complete product must serve two audiences:

- Clients: buy, brief, approve, follow progress, access the deployed project, and request changes.
- Internal team: monitor every organization, project, prompt, result, ticket, assessment, agent run, deployment, risk, and subscription.

## 2. Product Positioning

DevForge AI should be sold as a managed software delivery platform, not just an AI generator.

Primary offer:

- Project planning.
- AI-assisted execution.
- Human-controlled QA.
- Deployment/implementation.
- Recurring subscription for operation, improvements, and support.

The commercial framing should be:

- The client does not receive only code.
- The client receives a living project workspace, a published implementation URL, and a service subscription.
- The provider receives an internal control panel to operate many clients with agents and human review.

## 3. Target Users

### 3.1 Client User

The client wants to:

- Create a project request.
- Understand what will be delivered.
- Approve or request changes to the scope.
- Request changes during an active project through a project-scoped chat.
- Track delivery status without technical noise.
- Access the deployed project URL.
- Know what is included in the subscription.
- Request improvements after launch.

The client should not need to understand agent internals, raw prompts, orchestration, or technical logs.

### 3.2 Admin/Internal Team

The internal team wants to:

- Monitor all clients and organizations.
- Inspect every project in detail.
- See prompts, inputs, outputs, logs, costs, and generated records.
- Understand agent behavior and delivery quality.
- Intervene when an agent run is pending, failed, risky, or low confidence.
- Manage deployments and subscription status.
- Audit decisions.
- Prepare the system for multiple agents and multiple accounts.

### 3.3 Operator/Staff User

The operator is a non-admin internal user who can:

- Review projects assigned to them.
- Inspect agent runs.
- Resolve tickets.
- Run QA checklists.
- Publish or request approval for deployments, depending on permission level.

## 4. Current MVP Baseline

The local MVP already includes the foundation for:

- Authentication with seeded users.
- Organization and tenant isolation.
- Project creation.
- Simulated project plan generation.
- Project approvals.
- Roadmap stages.
- Tickets.
- Imports and assessments without executing imported code.
- Agent runs stored as auditable records.
- Local Codex handoff flow.
- Admin/team dashboard.
- Deployment records.
- Official project deployment URL, for example `/projects/:id/deployment`.

This is enough to validate the workflow locally, but not yet enough for a paid production launch.

## 5. Core Product Principles

1. Keep the product project-first, not chatbot-first.
2. Every important action must be attached to an organization and project.
3. Every agent execution must create an `AgentRun`.
4. Clients see delivery progress and business outcomes.
5. Internal users see operational detail and audit trails.
6. Imported code is never executed in the MVP.
7. Tenant isolation is non-negotiable.
8. Deployment is part of the product, not an afterthought.
9. Subscription state should control ongoing access, support, and implementation status.
10. Real orchestration can replace mocked agents only after audit and permissions are solid.

## 6. Client Experience Roadmap

### 6.1 Client Dashboard

The client dashboard should become the first useful screen after login.

Required sections:

- Active projects.
- Deployment URLs.
- Pending approvals.
- Subscription status.
- Latest delivery updates.
- Open requests.
- Next action required from the client.

Recommended status model:

- Brief received.
- Scope in planning.
- Waiting for approval.
- In production.
- QA review.
- Deployed.
- In maintenance.
- Paused.

The dashboard should avoid raw technical terms such as `AgentRun`, `mock`, `provider`, or `deployment environment`.

### 6.2 Project Detail For Client

Each project page should show:

- Contracted scope.
- Approved plan.
- Roadmap.
- Delivery timeline.
- Decisions and approvals.
- Deployment URL.
- Subscription information.
- Change requests.
- Messages related to the project.

The main action should change by project state:

- New project: complete brief.
- Waiting approval: approve scope or request changes.
- In production: view progress.
- Deployed: open implementation.
- Maintenance: request improvement.

### 6.3 Approval Flow

The approval flow should support:

- Approve scope.
- Request changes.
- Reject scope with required reason.
- Approve deployment.
- Request deployment fixes.

Each approval should store:

- Project.
- Organization.
- User.
- Decision.
- Comment.
- Timestamp.
- Version of the plan or deployment being approved.

### 6.4 Client Messages

Messages should be project-scoped and timeline-friendly.

Message types:

- Client message.
- Staff reply.
- Agent update.
- System event.
- Approval event.
- Deployment event.

The UI can show a communication panel, but it should not become the main product interface.

Client change requests should pass through a prompt refinement agent before they become execution work. Clients often describe changes imprecisely, so the system should convert raw messages into:

- A refined operational prompt.
- Intent classification.
- Priority.
- Clarifying questions.
- Suggested next steps.
- Tickets or queue items for the internal team.
- Token usage and estimated cost for the refinement run.

The raw client message must remain visible and auditable. The refined prompt should help the internal team and later agents execute the correct change without losing the client's original wording.

### 6.5 Client Subscription View

The client should see a simple subscription card:

- Plan name.
- Status.
- Start date.
- Renewal date.
- Included services.
- Active deployment URL.
- Support/change request allowance.

This prepares the commercial model for recurring revenue.

## 7. Admin And Internal Team Roadmap

### 7.1 Admin Cockpit

The admin home should become an operational cockpit.

Required metrics:

- Total organizations.
- Active clients.
- Active projects.
- Projects waiting approval.
- Projects in production.
- Active deployments.
- Failed deployments.
- Pending agent runs.
- Failed agent runs.
- Monthly estimated cost.
- Monthly tokens by project.
- Projects above token budget.
- Open high-priority tickets.

Required tables:

- Project monitor.
- Agent run monitor.
- Deployment monitor.
- Pending approvals.
- High-risk projects.

### 7.2 Project Operations View

Admin project detail should expose:

- Client and organization.
- Full brief.
- Plan.
- Roadmap stages.
- Tickets.
- Messages.
- Imports.
- Assessments.
- Exports.
- Deployment.
- Agent runs.
- Approval history.
- Audit timeline.

This page should be the internal source of truth for a project.

### 7.3 Agent Run Monitor

The agent monitor should allow filtering by:

- Organization.
- Project.
- Agent skill.
- Provider.
- Mode.
- Status.
- Date.
- Cost.
- Input tokens.
- Output tokens.
- Total tokens.
- Risk level.

Each run detail should show:

- Input.
- Output.
- Logs.
- Estimated cost.
- Token usage.
- Records created.
- Deployment URL generated, if any.
- Errors.
- Human review status.

Important: the team must be able to understand not only that an agent ran, but what it changed and why.

### 7.4 Prompt And Result Audit

The internal team needs a dedicated prompt/results view.

For every prompt or automated request, show:

- Who triggered it.
- Project.
- Organization.
- Agent.
- Prompt/input.
- Output/result.
- Created tickets.
- Created stages.
- Created messages.
- Created deployment.
- Cost.
- Tokens consumed.
- Logs.
- Timestamp.

This helps the business learn whether the system is delivering quality.

### 7.5 Token Usage Monitoring

Token usage must be monitored per project, organization, agent, and provider. This is important for margin control, client profitability, abuse detection, and understanding which workflows consume the most AI budget.

Required metrics:

- Total tokens by project.
- Input tokens by project.
- Output tokens by project.
- Tokens by organization.
- Tokens by agent skill.
- Tokens by provider/model.
- Tokens by day, week, and month.
- Estimated cost by project.
- Average tokens per successful delivery.
- Token usage per deployment.
- Token usage per approved plan.

Admin views should include:

- Project token ledger.
- Organization token summary.
- Agent token ranking.
- High-consumption runs.
- Budget alerts.
- Month-to-date usage.
- Token cost versus subscription revenue.

Each `AgentRun` must store token accounting fields for every AI/agent execution. Real providers should write actual usage. Mocked or unavailable providers should write `0` or estimated values with an explicit marker that usage is estimated or unavailable.

Required fields:

- Provider.
- Model.
- Input tokens.
- Output tokens.
- Total tokens.
- Cached tokens, when available.
- Reasoning tokens, when available.
- Estimated cost.
- Currency.
- Billing period.
- Usage source: actual, estimated, mock, or unavailable.

Recommended controls:

- Soft token budget per project.
- Hard token budget per organization.
- Alert when a project reaches 80 percent of budget.
- Require admin approval for runs above a configured token threshold.
- Show token cost before running expensive workflows when possible.

Client visibility should be limited. Clients may see usage included in the subscription, but raw token accounting should primarily be internal unless the commercial model explicitly exposes it.

### 7.6 Deployment Management

Deployment should be treated as a first-class commercial object.

Deployment fields should eventually include:

- Organization.
- Project.
- Subscription.
- URL.
- Environment.
- Status.
- Version.
- Published by.
- Published at.
- Last health check.
- Notes.
- Rollback reference.

Admin actions:

- Publish deployment.
- Republish deployment.
- Disable deployment.
- Mark failed.
- Run QA checklist.
- Copy URL.
- Open as admin.
- View as client.

### 7.7 QA Checklist

Before a deployment is marked active, the admin/team should complete a QA checklist.

Minimum checklist:

- Scope approved.
- Roadmap completed.
- Critical tickets resolved.
- No blocking assessment risk.
- Deployment URL reachable.
- Client-facing page reviewed.
- Internal notes completed.
- Subscription active.

The checklist should create an audit event.

### 7.8 Team Queue

The internal team needs a queue that answers: what needs human attention now?

Queue item types:

- Waiting client approval.
- Client requested changes.
- Agent run pending.
- Agent run failed.
- High-risk assessment.
- Deployment failed.
- QA required.
- Subscription issue.
- High-priority ticket.

Each queue item should link directly to the correct project context.

## 8. Product Modules

### 8.1 Accounts And Organizations

Required capabilities:

- Register client.
- Create organization.
- Invite users.
- Assign roles.
- Enforce tenant isolation.
- Admin can inspect all organizations.
- Staff can inspect authorized organizations.

Future roles:

- Client owner.
- Client member.
- Admin.
- Staff/operator.
- Finance.
- QA reviewer.

### 8.2 Projects

Required capabilities:

- Create project.
- Edit brief.
- Attach metadata.
- Generate plan.
- Approve plan.
- Track lifecycle.
- Link tickets, messages, stages, imports, assessments, exports, deployments, and agent runs.

Project lifecycle should be explicit:

- Draft.
- Planning.
- Waiting approval.
- Active.
- QA.
- Deployed.
- Maintenance.
- Blocked.
- Canceled.

### 8.3 Planning

Planning should generate:

- Summary.
- Features.
- Risks.
- Roadmap.
- Estimate.
- Acceptance criteria.
- Suggested subscription package.

Plans should be versioned before production launch.

### 8.4 Roadmap

Roadmap stages should be clear to client and detailed internally.

Client labels:

- Briefing.
- Scope.
- Build.
- Review.
- Implementation.
- Support.

Internal labels can remain more detailed:

- Briefing.
- Planning.
- Frontend.
- Backend.
- Tests.
- Review.
- Deploy.
- Export.

### 8.5 Tickets

Tickets should support:

- Priority.
- Status.
- Source.
- Assignee.
- Due date.
- Project link.
- AgentRun link when generated by an agent.
- Client visibility flag.

Not every internal ticket should be visible to the client.

### 8.6 Imports And Assessments

Imports must remain safe:

- Register Git URL or ZIP metadata.
- Inspect structure.
- Do not execute imported code.
- Generate assessment.
- Generate migration/rebuild tickets.

Future production imports should use sandboxed workers.

### 8.7 Agents

Agent orchestration should evolve in layers:

1. Deterministic mocked services.
2. Local Codex handoff with audit.
3. Prompt refinement for unclear client change requests.
4. Queue-backed workers.
5. Provider abstraction.
6. Multi-agent workflows.
7. Human approval gates.

Every agent must:

- Create an `AgentRun`.
- Store input and output.
- Store logs.
- Store token usage and estimated cost.
- Scope data by organization.
- Declare created records.
- Never silently modify cross-tenant data.

### 8.8 Deployments

Deployment is the bridge between delivery and subscription.

Deployment capabilities:

- Publish URL.
- Track status.
- Link to project.
- Link to subscription.
- Show to client.
- Monitor internally.
- Support disable/failure states.

Near-term local implementation can publish a protected Next.js route. Later production implementation should support real deployed applications, domains, and health checks.

### 8.9 Billing And Subscriptions

Subscriptions should eventually control:

- Active implementation access.
- Support level.
- Maintenance queue priority.
- Monthly change request allowance.
- Deployment availability.
- SLA.

Initial billing model can be internal/manual. Later versions can integrate Stripe or another provider.

### 8.10 Exports

Exports should package:

- Plan.
- Roadmap.
- Tickets.
- Assessment.
- Deployment metadata.
- Generated code package when available.

Exports should not replace deployment. They are an additional delivery artifact.

## 9. Data And Audit Requirements

Every major record should include:

- Organization.
- Project when applicable.
- Created by.
- Created at.
- Updated at.

Important events should be represented in an audit timeline:

- Project created.
- Plan generated.
- Approval submitted.
- Agent run started.
- Agent run completed.
- Ticket created.
- Assessment generated.
- Deployment published.
- Deployment disabled.
- Subscription status changed.

Audit records should be readable by admin and scoped for clients.

## 10. Security And Isolation

Production readiness requires:

- Strong object-level permissions.
- Tenant isolation tests.
- No hardcoded production secrets.
- Secure JWT/session handling.
- Rate limiting on auth endpoints.
- Audit trail for admin actions.
- Safe file upload validation.
- No execution of imported code outside a sandbox.
- Admin/staff permissions separated.
- Deployment URLs protected by project access rules.

## 11. Roadmap To Complete Product Launch

### Phase 0: Local MVP Stabilization ✅ COMPLETE (2026-06-04)

Goal: make the current local product coherent and demonstrable.

Delivered:

- Client creates project → plan, roadmap, and tickets generated automatically.
- Client can approve, request changes (with required comment), or reject scope.
- Local Codex and Claude Code handoff workflows create auditable `AgentRun` records.
- Admin inspects projects, prompts, outputs, tickets, assessments, deployments, and agent runs.
- Deployment URL published at `/projects/:id/deployment`.
- Docker Compose starts all services (postgres, redis, minio, gitea, backend, celery, frontend).
- Token accounting fields on every `AgentRun` (input/output/total tokens, cost, currency, source).
- Backend tests pass (13/13). Frontend typecheck passes. Ruff passes.

### Phase 1: Client Portal Quality ✅ COMPLETE (2026-06-04)

Goal: make the client side feel like a paid product.

Delivered:

- Sidebar navigation wired: Dashboard, Projetos, Mensagens, Tickets, Agent Runs, Exportacoes each show focused content.
- Client Dashboard: summary cards (active, waiting approval, deployed) + project list with status labels and deployment links.
- Human-readable status labels throughout client view (no technical strings exposed).
- Next-action banner per project — clients know what to do within 30 seconds.
- Prominent delivery card: teal highlight + "Acessar projeto →" button when deployed.
- Approval flow: "Aprovar" = one click; "Solicitar mudanças"/"Rejeitar" require a comment (enforced backend + frontend).
- Project timeline (Histórico de entregas): plan, approvals, agent updates, deployment events.
- Subscription stub card (placeholder for Phase 4).
- `ApprovalSerializer` enforces non-empty comment on changes_requested/rejected (HTTP 400).

### Phase 2: Admin Operations Cockpit

Goal: make the internal team capable of operating many clients.

Deliverables:

- Admin cockpit.
- Project operations detail.
- Agent run monitor.
- Prompt/output audit view.
- Minimal token ledger fields on `AgentRun`.
- Token usage dashboard by project.
- Deployment management screen.
- Team queue.
- Filters by organization, project, status, agent, token usage, cost, and date.

Exit criteria:

- Admin can diagnose any project from one place.
- Admin can inspect every agent input and output.
- Admin can see token usage and estimated cost per project.
- Mocked runs can report estimated or explicitly unavailable token usage.
- Admin can see all active deployments and failed states.

### Phase 3: Workflow And QA Gates

Goal: prevent bad deliveries from being published.

Deliverables:

- QA checklist model.
- Deployment publish workflow.
- Approval required before deployment.
- Deployment status transitions.
- Audit timeline.
- Client-visible vs internal-only ticket distinction.
- Plan versioning.

Exit criteria:

- A deployment cannot be marked active without required checks.
- Every publish event is auditable.
- Client approvals are tied to specific plan/deployment versions.

### Phase 4: Subscription And Commercial Layer

Goal: support the real business model.

Deliverables:

- Subscription model.
- Plan/package definitions.
- Manual billing status.
- Subscription status on client/admin views.
- Deployment linked to subscription.
- Access rules based on active subscription.
- Internal subscription management screen.

Exit criteria:

- Admin can activate/pause/cancel a subscription.
- Client can see subscription status.
- Deployment state reflects subscription state.

### Phase 5: Real Agent Orchestration

Goal: replace deterministic mocks with controlled real orchestration.

Deliverables:

- Provider abstraction.
- Queue-backed agent execution.
- Agent retry policy.
- Agent failure states.
- Human approval gates.
- Tool permission model.
- Multi-agent workflow definitions.
- Cost tracking.
- Real provider token accounting.
- Project token budgets.

Exit criteria:

- Real agent execution can be enabled per environment.
- Every execution remains auditable.
- Every execution records token usage.
- Failed or risky runs require human review.

### Phase 6: Imports, Sandboxing, And Code Packages

Goal: support existing projects and generated code packages safely.

Deliverables:

- Secure ZIP upload to object storage.
- Repository metadata ingestion.
- Sandbox design for future execution.
- Import assessment improvements.
- Generated ticket backlog for migration.
- Export package generation.
- Downloadable handoff bundle.

Exit criteria:

- Imported repositories are assessed without unsafe execution.
- Complex projects produce actionable tickets.
- Admin can export a full handoff package.

### Phase 7: Production Infrastructure

Goal: launch a hosted product.

Deliverables:

- Production settings.
- Managed Postgres.
- Managed Redis.
- Object storage.
- Domain and TLS.
- CI/CD.
- Backups.
- Logging.
- Error monitoring.
- Health checks.
- Secrets management.

Exit criteria:

- Production deploy is repeatable.
- Backups are tested.
- Errors are observable.
- No production secrets are committed.

### Phase 8: Beta Launch

Goal: onboard first controlled users.

Deliverables:

- Beta onboarding flow.
- Admin playbook.
- Client help copy.
- Feedback capture.
- Manual billing process.
- Support queue.
- Launch checklist.

Exit criteria:

- 3 to 5 real client projects can be managed safely.
- Internal team can monitor all work.
- Critical bugs are tracked and resolved.

### Phase 9: Public Launch

Goal: release the complete product offer.

Deliverables:

- Stable pricing/packages.
- Production billing integration.
- Self-service client signup, if desired.
- Subscription lifecycle automation.
- Deployment lifecycle automation.
- Team permissions.
- SLA/support workflow.
- Product analytics.

Exit criteria:

- A client can subscribe, create a project, approve scope, follow delivery, and access deployment.
- Admin can operate multiple clients without direct database intervention.
- Agent behavior is observable and controllable.

## 12. Launch Readiness Checklist

### Product

- Client dashboard complete.
- Admin cockpit complete.
- Project lifecycle clear.
- Deployment lifecycle clear.
- Subscription lifecycle clear.
- Approval flow complete.
- QA gate complete.

### Engineering

- Tenant isolation tests.
- Lifecycle transition tests.
- Agent run tests.
- Token accounting tests.
- Deployment tests.
- Permission tests.
- Frontend typecheck.
- Backend lint.
- Docker Compose validated.
- Production configuration separated.

### Operations

- Admin playbook.
- Incident process.
- Backup process.
- Client onboarding process.
- Support workflow.
- Billing workflow.

### Commercial

- Offer defined.
- Pricing defined.
- Subscription terms defined.
- Implementation scope boundaries defined.
- Change request policy defined.

## 13. Recommended Next Implementation Order

1. Build improved client project detail with subscription and deployment framing.
2. Build admin deployment management screen.
3. Build admin agent run monitor with prompt/output details.
4. Add token usage monitoring by project and organization.
5. Add project audit timeline.
6. Add QA checklist before active deployment.
7. Add subscription model and manual admin controls.
8. Add plan versioning and approval-to-version linkage.
9. Add stronger permission tests.
10. Add production deployment preparation.
11. Start beta onboarding.

## 14. Definition Of Complete Product

DevForge AI can be considered a complete launchable product when:

- A client can create an account and organization.
- A client can create a project.
- The system can generate a structured plan.
- The client can approve, reject, or request changes.
- The internal team can monitor all prompts, outputs, tickets, and results.
- The internal team can monitor token usage and cost per project.
- Agents create auditable `AgentRun` records.
- Roadmap stages and tickets drive delivery.
- A deployment URL is published as part of the subscription.
- Admin can manage deployment state.
- Subscription status is visible and operationally meaningful.
- Tenant data is isolated.
- Imports are assessed safely.
- QA gates exist before deployment.
- The product can run in production with backups, logs, secrets, and monitoring.

At that point, DevForge AI is no longer just a prototype. It becomes an operational platform for selling and managing automated software delivery as a subscription.
