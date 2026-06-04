from __future__ import annotations

import os

from .models import Deployment


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
