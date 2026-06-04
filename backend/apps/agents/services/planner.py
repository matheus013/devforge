from __future__ import annotations

from apps.agents.models import AgentRun
from apps.agents.registry import agent_log_context


def build_project_plan(project) -> dict:
    features = [
        "Autenticacao e organizacoes",
        "Cadastro e acompanhamento de projetos",
        "Chat contextual com agente",
        "Roadmap visual auditavel",
        "Tickets automaticos",
        "Solicitacao de exportacao",
    ]
    risks = ["Escopo pode crescer rapido", "Importacoes precisam de sandbox futuro"]
    plan = {
        "summary": (
            f"Plano inicial para {project.name}, "
            "priorizando fluxo funcional e arquitetura modular."
        ),
        "features": features,
        "risks": risks,
        "stack": project.stack or {"frontend": "Next.js", "backend": "Django REST Framework"},
        "roadmap": [
            "Briefing",
            "Planejamento",
            "Frontend",
            "Backend",
            "Testes",
            "Revisao",
            "Deploy",
            "Exportacao",
        ],
        "estimate": {"weeks": 4, "confidence": "medium", "team": "AI-assisted squad"},
        "acceptance_criteria": [
            "Cliente consegue aprovar ou pedir mudancas",
            "Todas as etapas aparecem no roadmap",
            "Tickets relevantes sao criados automaticamente",
        ],
        "status": "waiting_approval",
    }
    AgentRun.objects.create(
        organization=project.organization,
        project=project,
        skill="project-planner",
        input={"project_id": project.id, "description": project.description},
        output=plan,
        estimated_cost="1.20",
        logs=[agent_log_context("project-planner"), "Generated mocked project plan"],
    )
    return plan
