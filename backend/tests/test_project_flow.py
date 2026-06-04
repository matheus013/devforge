from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.agents.models import AgentRun
from apps.approvals.models import Approval
from apps.approvals.services import record_approval
from apps.organizations.models import Organization, OrganizationMember
from apps.projects.models import Project, ProjectMessage, ProjectPlan, ProjectStage
from apps.projects.services import create_project_with_plan
from apps.tickets.models import Ticket


@pytest.mark.django_db
def test_project_creation_generates_plan_and_roadmap():
    user = get_user_model().objects.create_user(
        email="u@test.com", username="u", password="password123"
    )
    org = Organization.objects.create(name="Org", slug="org")
    OrganizationMember.objects.create(organization=org, user=user, role="owner")

    project = create_project_with_plan(
        user=user,
        organization=org,
        name="Build",
        description="Portal with ai import workflow",
        type=Project.Type.NEW_BUILD,
        stack={"frontend": "Next.js"},
    )

    assert ProjectPlan.objects.filter(project=project, status="waiting_approval").exists()
    assert ProjectStage.objects.filter(project=project).count() == 8
    assert project.tickets.exists()


@pytest.mark.django_db
def test_approval_updates_project_and_plan():
    user = get_user_model().objects.create_user(
        email="u2@test.com", username="u2", password="password123"
    )
    org = Organization.objects.create(name="Org 2", slug="org-2")
    OrganizationMember.objects.create(organization=org, user=user, role="owner")
    project = create_project_with_plan(
        user=user, organization=org, name="Build", type=Project.Type.NEW_BUILD
    )

    approval = record_approval(
        user=user,
        project=project,
        plan=project.plan,
        decision=Approval.Decision.APPROVED,
    )

    project.refresh_from_db()
    project.plan.refresh_from_db()
    assert approval.project.organization_id == org.id
    assert project.status == Project.Status.ACTIVE
    assert project.plan.status == "approved"


@pytest.mark.django_db
def test_agent_runs_are_isolated_by_organization():
    user_model = get_user_model()
    acme_user = user_model.objects.create_user(
        email="acme@test.com", username="acme", password="password123"
    )
    beta_user = user_model.objects.create_user(
        email="beta@test.com", username="beta", password="password123"
    )
    acme = Organization.objects.create(name="Acme", slug="acme-test")
    beta = Organization.objects.create(name="Beta", slug="beta-test")
    OrganizationMember.objects.create(organization=acme, user=acme_user, role="owner")
    OrganizationMember.objects.create(organization=beta, user=beta_user, role="owner")

    acme_project = create_project_with_plan(
        user=acme_user, organization=acme, name="Acme Build", type=Project.Type.NEW_BUILD
    )
    beta_project = create_project_with_plan(
        user=beta_user, organization=beta, name="Beta Build", type=Project.Type.NEW_BUILD
    )

    assert AgentRun.objects.filter(project=acme_project).exists()
    assert AgentRun.objects.filter(project=beta_project).exists()

    client = APIClient()
    client.force_authenticate(user=acme_user)
    response = client.get("/api/agent-runs/")

    assert response.status_code == 200
    project_ids = {item["project"] for item in response.json()}
    assert acme_project.id in project_ids
    assert beta_project.id not in project_ids


@pytest.mark.django_db
def test_local_agent_registry_is_available_to_authenticated_users():
    user = get_user_model().objects.create_user(
        email="registry@test.com", username="registry", password="password123"
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/agent-runs/registry/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_runner"] in ["codex", "claude-code"]
    assert set(payload["allowed_runners"]) == {"codex", "claude-code"}
    assert {agent["skill"] for agent in payload["agents"]} >= {
        "codex-local-operator",
        "claude-code-local-operator",
        "change-request-refiner",
        "project-planner",
        "complexity-classifier",
        "import-analyzer",
        "ticket-triage",
    }


@pytest.mark.django_db
def test_client_can_request_codex_local_handoff_for_own_project():
    user = get_user_model().objects.create_user(
        email="codex@test.com", username="codex", password="password123"
    )
    org = Organization.objects.create(name="Codex Org", slug="codex-org")
    OrganizationMember.objects.create(organization=org, user=user, role="owner")
    project = create_project_with_plan(
        user=user,
        organization=org,
        name="Codex Build",
        type=Project.Type.NEW_BUILD,
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(
        "/api/agent-runs/request-codex/",
        {"project_id": project.id, "objective": "Revisar o proximo passo operacional."},
        format="json",
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["skill"] == "codex-local-operator"
    assert payload["status"] == "pending_codex"
    assert payload["project"] == project.id


@pytest.mark.django_db
def test_client_can_resolve_project_with_codex_local_operator():
    user = get_user_model().objects.create_user(
        email="resolve@test.com", username="resolve", password="password123"
    )
    org = Organization.objects.create(name="Resolve Org", slug="resolve-org")
    OrganizationMember.objects.create(organization=org, user=user, role="owner")
    project = create_project_with_plan(
        user=user,
        organization=org,
        name="Resolve Build",
        type=Project.Type.NEW_BUILD,
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(
        "/api/agent-runs/resolve-project/",
        {"project_id": project.id, "objective": "Resolver backlog inicial do projeto."},
        format="json",
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["skill"] == "codex-local-operator"
    assert payload["status"] == "completed"
    assert payload["output"]["next_actions"]
    assert Ticket.objects.filter(project=project, source="codex-local").count() == 3
    assert project.messages.filter(metadata__codex_local=True).exists()


@pytest.mark.django_db
def test_client_message_creates_refined_change_request_agent_run_and_ticket():
    user = get_user_model().objects.create_user(
        email="change@test.com", username="change", password="password123"
    )
    org = Organization.objects.create(name="Change Org", slug="change-org")
    OrganizationMember.objects.create(organization=org, user=user, role="owner")
    project = create_project_with_plan(
        user=user,
        organization=org,
        name="Change Build",
        type=Project.Type.NEW_BUILD,
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(
        "/api/messages/",
        {
            "project": project.id,
            "body": "Quero adicionar relatorio financeiro mensal, mas nao sei explicar direito.",
        },
        format="json",
    )

    assert response.status_code == 201
    message = ProjectMessage.objects.get(id=response.json()["id"])
    assert message.metadata["change_request"] is True
    assert message.metadata["refined_prompt"]
    assert message.metadata["token_usage"]["source"] == "estimated"
    run = AgentRun.objects.get(project=project, skill="change-request-refiner")
    assert run.total_tokens > 0
    assert run.input_tokens > 0
    assert run.output_tokens > 0
    assert run.token_usage_source == "estimated"
    ticket = Ticket.objects.get(project=project, source="client-change-request")
    assert str(run.id) in ticket.description
    assert ProjectMessage.objects.filter(
        project=project, sender=ProjectMessage.Sender.AGENT, metadata__change_request_refined=True
    ).exists()


@pytest.mark.django_db
def test_client_change_request_is_immutable_and_tenant_scoped():
    user_model = get_user_model()
    owner = user_model.objects.create_user(
        email="owner@test.com", username="owner", password="password123"
    )
    outsider = user_model.objects.create_user(
        email="outsider@test.com", username="outsider", password="password123"
    )
    org = Organization.objects.create(name="Immutable Org", slug="immutable-org")
    other_org = Organization.objects.create(name="Other Org", slug="other-org")
    OrganizationMember.objects.create(organization=org, user=owner, role="owner")
    OrganizationMember.objects.create(organization=other_org, user=outsider, role="owner")
    project = create_project_with_plan(
        user=owner,
        organization=org,
        name="Immutable Build",
        type=Project.Type.NEW_BUILD,
    )

    client = APIClient()
    client.force_authenticate(user=owner)
    response = client.post(
        "/api/messages/",
        {"project": project.id, "body": "Alteracao: adicionar tela de indicadores."},
        format="json",
    )
    message_id = response.json()["id"]

    assert client.patch(
        f"/api/messages/{message_id}/", {"body": "texto alterado"}, format="json"
    ).status_code == 405
    assert client.delete(f"/api/messages/{message_id}/").status_code == 405

    client.force_authenticate(user=outsider)
    response = client.post(
        "/api/messages/",
        {"project": project.id, "body": "Tentar alterar projeto de outra org."},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_urgent_change_request_keeps_refined_change_ticket():
    user = get_user_model().objects.create_user(
        email="urgent@test.com", username="urgent", password="password123"
    )
    org = Organization.objects.create(name="Urgent Org", slug="urgent-org")
    OrganizationMember.objects.create(organization=org, user=user, role="owner")
    project = create_project_with_plan(
        user=user,
        organization=org,
        name="Urgent Build",
        type=Project.Type.NEW_BUILD,
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(
        "/api/messages/",
        {
            "project": project.id,
            "body": "Mudança crítica: corrigir erro urgente no financeiro hoje.",
        },
        format="json",
    )

    assert response.status_code == 201
    ticket = Ticket.objects.get(project=project, source="client-change-request")
    assert ticket.priority == "high"
    assert "Prompt" not in ProjectMessage.objects.filter(
        project=project, sender=ProjectMessage.Sender.AGENT
    ).latest("created_at").body
