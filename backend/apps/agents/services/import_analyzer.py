from __future__ import annotations

from apps.agents.models import AgentRun
from apps.agents.registry import agent_log_context


def analyze_import(project_import) -> dict:
    source = project_import.git_url or project_import.zip_file_name or "unknown"
    stack = ["Django"] if "django" in source.lower() else ["Next.js", "TypeScript"]
    report = {
        "stack": stack,
        "frameworks": stack,
        "risks": [
            "Executar codigo importado esta bloqueado no MVP",
            "Validar secrets antes da migracao",
        ],
        "score": 74,
        "recommendation": "Prosseguir com assessment manual antes de qualquer execucao automatica.",
    }
    AgentRun.objects.create(
        organization=project_import.organization,
        project=project_import.project,
        skill="import-analyzer",
        input={"source": source},
        output=report,
        estimated_cost="0.80",
        logs=[agent_log_context("import-analyzer"), "Analyzed structure without executing code"],
    )
    return report
