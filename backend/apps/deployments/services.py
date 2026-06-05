from __future__ import annotations

import os

from .models import Deployment, QAChecklist


def deployment_url_for_project(project) -> str:
    frontend_url = os.getenv("DEVFORGE_FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{frontend_url}/projects/{project.id}/deployment"


def publish_subscription_deployment(*, project, notes: str = "") -> Deployment:
    deployment, _ = Deployment.objects.update_or_create(
        project=project,
        defaults={
            "organization": project.organization,
            "environment": "subscription-deployment",
            "status": Deployment.Status.READY,
            "url": deployment_url_for_project(project),
            "notes": notes,
        },
    )
    return deployment


def refresh_qa_checklist(deployment: Deployment) -> QAChecklist:
    project = deployment.project
    scope_approved = project.approvals.filter(decision="approved").exists()
    roadmap_completed = (
        project.stages.exists()
        and not project.stages.exclude(status="done").exists()
    )
    no_blocking_tickets = not project.tickets.filter(
        priority="high", status__in=["open", "in_progress"]
    ).exists()

    checklist, _ = QAChecklist.objects.get_or_create(
        deployment=deployment,
        defaults={"organization": deployment.organization},
    )
    checklist.scope_approved = scope_approved
    checklist.roadmap_completed = roadmap_completed
    checklist.no_blocking_tickets = no_blocking_tickets
    checklist.save(
        update_fields=[
            "scope_approved", "roadmap_completed", "no_blocking_tickets", "updated_at"
        ]
    )
    return checklist
