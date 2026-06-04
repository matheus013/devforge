from __future__ import annotations

from django.db import transaction

from apps.agents.models import AgentRun
from apps.agents.registry import agent_log_context
from apps.deployments.services import publish_subscription_deployment
from apps.projects.models import Project, ProjectMessage, ProjectStage
from apps.tickets.models import Ticket


def request_codex_handoff(*, project, objective: str, requested_by) -> AgentRun:
    return AgentRun.objects.create(
        organization=project.organization,
        project=project,
        skill="codex-local-operator",
        status="pending_codex",
        input={
            "project_id": project.id,
            "project_name": project.name,
            "objective": objective,
            "requested_by": requested_by.email,
        },
        output={
            "handoff": (
                "Codex deve atuar localmente no workspace, manter isolamento por organizacao, "
                "registrar decisoes no projeto e nao executar codigo importado."
            ),
            "next_step": "Abrir a fila de AgentRun com status pending_codex e executar a tarefa.",
        },
        estimated_cost="0.00",
        logs=[
            agent_log_context("codex-local-operator"),
            "Solicitacao criada para atuacao do Codex no ambiente local.",
        ],
    )


@transaction.atomic
def resolve_project_with_codex(*, project: Project, objective: str, requested_by) -> AgentRun:
    tickets = [
        (
            "Codex: consolidar requisitos operacionais",
            "Transformar o briefing atual em criterios de aceite testaveis por tela e fluxo.",
            "high",
        ),
        (
            "Codex: preparar backlog da proxima entrega",
            "Quebrar o projeto em tickets pequenos para frontend, backend, dados e validacao.",
            "normal",
        ),
        (
            "Codex: revisar riscos de isolamento",
            "Garantir que organizacao, projetos, agent runs e imports seguem escopo multi-tenant.",
            "high",
        ),
    ]
    created_tickets = []
    for title, description, priority in tickets:
        ticket, created = Ticket.objects.get_or_create(
            organization=project.organization,
            project=project,
            title=title,
            defaults={
                "description": description,
                "priority": priority,
                "status": Ticket.Status.OPEN,
                "source": "codex-local",
            },
        )
        if created:
            created_tickets.append(ticket.title)

    first_stage = project.stages.order_by("order").first()
    if first_stage and first_stage.status == ProjectStage.Status.TODO:
        first_stage.status = ProjectStage.Status.IN_PROGRESS
        first_stage.save(update_fields=["status"])

    if project.status == Project.Status.WAITING_APPROVAL:
        project.status = Project.Status.PLANNING
        project.save(update_fields=["status", "updated_at"])

    next_actions = [
        "Validar plano com o cliente e decidir aprovar, rejeitar ou pedir mudancas.",
        "Executar tickets Codex em ordem de prioridade.",
        "Manter imports apenas como assessment estrutural ate existir sandbox real.",
    ]
    summary = (
        f"Codex local analisou {project.name} e preparou uma fila operacional "
        "sem executar codigo externo."
    )
    ProjectMessage.objects.create(
        organization=project.organization,
        project=project,
        sender=ProjectMessage.Sender.AGENT,
        body=summary,
        metadata={
            "codex_local": True,
            "objective": objective,
            "created_tickets": created_tickets,
        },
    )
    all_stages_done = all(
        stage.status == ProjectStage.Status.DONE for stage in project.stages.all()
    )
    deployment = publish_subscription_deployment(
        project=project,
        notes="Implantacao de assinatura publicada pelo Codex local para cliente e time.",
    )
    if all_stages_done:
        project.status = Project.Status.EXPORTED
        project.save(update_fields=["status", "updated_at"])

    return AgentRun.objects.create(
        organization=project.organization,
        project=project,
        skill="codex-local-operator",
        status="completed",
        input={
            "project_id": project.id,
            "project_name": project.name,
            "objective": objective,
            "requested_by": requested_by.email,
        },
        output={
            "summary": summary,
            "created_tickets": created_tickets,
            "next_actions": next_actions,
            "safety": "Nao executou codigo importado; operou apenas em registros do projeto.",
            "deployment_url": deployment.url if deployment else "",
        },
        estimated_cost="0.00",
        logs=[
            agent_log_context("codex-local-operator"),
            "Projeto analisado pelo Codex local.",
            f"Tickets criados: {len(created_tickets)}",
        ],
    )
