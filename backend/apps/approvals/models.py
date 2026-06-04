from __future__ import annotations

from django.conf import settings
from django.db import models


class Approval(models.Model):
    class Decision(models.TextChoices):
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CHANGES_REQUESTED = "changes_requested", "Changes requested"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="approvals"
    )
    plan = models.ForeignKey(
        "projects.ProjectPlan", on_delete=models.CASCADE, related_name="approvals"
    )
    decision = models.CharField(max_length=40, choices=Decision.choices)
    comment = models.TextField(blank=True)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.decision} for {self.project_id}"
