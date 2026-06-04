from __future__ import annotations

from django.db import transaction

from apps.agents.services.complexity import classify_project
from apps.agents.services.planner import build_project_plan
from apps.agents.services.prompt_refiner import refine_change_request
from apps.agents.services.ticket_triage import maybe_create_ticket
from apps.tickets.models import Ticket

from .models import Project, ProjectMessage, ProjectPlan, ProjectStage

DEFAULT_STAGES = [
    "Briefing",
    "Planejamento",
    "Frontend",
    "Backend",
    "Testes",
    "Revisao",
    "Deploy",
    "Exportacao",
]


@transaction.atomic
def create_project_with_plan(
    *,
    user,
    organization,
    name: str,
    type: str,
    description: str = "",
    stack: dict | None = None,
) -> Project:
    project = Project.objects.create(
        organization=organization,
        name=name,
        description=description,
        type=type,
        stack=stack or {},
        created_by=user,
        status=Project.Status.WAITING_APPROVAL,
    )
    plan = build_project_plan(project)
    ProjectPlan.objects.create(organization=organization, project=project, **plan)
    for index, stage_name in enumerate(DEFAULT_STAGES, start=1):
        ProjectStage.objects.create(
            organization=organization,
            project=project,
            name=stage_name,
            order=index,
            status=ProjectStage.Status.IN_PROGRESS if index == 1 else ProjectStage.Status.TODO,
        )
    complexity = classify_project(project)
    maybe_create_ticket(project=project, reason="project_created", signal=complexity)
    return project


@transaction.atomic
def handle_project_message(*, user, project, body: str) -> ProjectMessage:
    refinement_run = refine_change_request(project=project, raw_message=body, requested_by=user)
    refinement = refinement_run.output
    message = ProjectMessage.objects.create(
        organization=project.organization,
        project=project,
        sender=ProjectMessage.Sender.CLIENT,
        body=body,
        metadata={
            "context_added": True,
            "change_request": True,
            "refinement_run_id": refinement_run.id,
            "refined_prompt": refinement["refined_prompt"],
            "intent": refinement["intent"],
            "priority": refinement["priority"],
            "token_usage": refinement["token_usage"],
        },
    )
    Ticket.objects.create(
        organization=project.organization,
        project=project,
        title="Avaliar solicitacao de alteracao do cliente",
        description=(
            f"{refinement['refined_prompt']}\n\n"
            f"AgentRun de refinamento: {refinement_run.id}\n"
            f"Perguntas: {'; '.join(refinement['clarification_questions'])}"
        ),
        priority=refinement["priority"],
        status=Ticket.Status.OPEN,
        source="client-change-request",
    )
    ProjectMessage.objects.create(
        organization=project.organization,
        project=project,
        sender=ProjectMessage.Sender.AGENT,
        body=(
            "Entendi seu pedido de alteracao. Antes de executar, vou organizar o escopo "
            "e levantar perguntas para aumentar a acertividade da entrega."
        ),
        metadata={
            "mocked_agent": True,
            "change_request_refined": True,
            "refinement_run_id": refinement_run.id,
            "refined_prompt": refinement["refined_prompt"],
            "clarification_questions": refinement["clarification_questions"],
            "suggested_next_steps": refinement["suggested_next_steps"],
            "token_usage": refinement["token_usage"],
        },
    )
    return message
