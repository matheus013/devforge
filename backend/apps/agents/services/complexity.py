from __future__ import annotations

from apps.agents.models import AgentRun
from apps.agents.registry import agent_log_context


def classify_project(project) -> dict:
    text = f"{project.name} {project.description} {project.stack}".lower()
    keywords = ["payment", "multi", "legacy", "erp", "ai", "import"]
    score = sum(keyword in text for keyword in keywords)
    if score >= 3 or project.type == "imported_project":
        level = "complex"
    elif score:
        level = "moderate"
    else:
        level = "simple"
    output = {
        "level": level,
        "priority": "high" if level == "complex" else "normal",
        "requires_ticket": level != "simple",
    }
    AgentRun.objects.create(
        organization=project.organization,
        project=project,
        skill="complexity-classifier",
        input={"project_id": project.id},
        output=output,
        estimated_cost="0.35",
        logs=[agent_log_context("complexity-classifier"), f"Classified as {level}"],
    )
    return output
