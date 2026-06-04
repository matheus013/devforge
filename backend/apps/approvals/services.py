from __future__ import annotations

from django.db import transaction

from apps.projects.models import Project

from .models import Approval


@transaction.atomic
def record_approval(*, user, project, plan, decision: str, comment: str = "") -> Approval:
    approval = Approval.objects.create(
        organization=project.organization,
        project=project,
        plan=plan,
        decision=decision,
        comment=comment,
        decided_by=user,
    )
    if decision == Approval.Decision.APPROVED:
        project.status = Project.Status.ACTIVE
        plan.status = "approved"
    elif decision == Approval.Decision.REJECTED:
        project.status = Project.Status.BLOCKED
        plan.status = "rejected"
    else:
        project.status = Project.Status.PLANNING
        plan.status = "changes_requested"
    project.save(update_fields=["status", "updated_at"])
    plan.save(update_fields=["status", "updated_at"])
    return approval
