from __future__ import annotations

from django.conf import settings
from django.db import models


class Deployment(models.Model):
    class Status(models.TextChoices):
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"
        DISABLED = "disabled", "Disabled"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.OneToOneField(
        "projects.Project", on_delete=models.CASCADE, related_name="deployment"
    )
    environment = models.CharField(max_length=40, default="subscription-deployment")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.READY)
    url = models.URLField(max_length=500)
    admin_url = models.URLField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.project_id} {self.environment}: {self.status}"


class QAChecklist(models.Model):
    deployment = models.OneToOneField(
        Deployment, on_delete=models.CASCADE, related_name="qa_checklist"
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    # Auto-computed from project state (refreshed by the API)
    scope_approved = models.BooleanField(default=False)
    roadmap_completed = models.BooleanField(default=False)
    no_blocking_tickets = models.BooleanField(default=False)
    # Manual checks — admin must verify
    url_reachable = models.BooleanField(default=False)
    client_page_reviewed = models.BooleanField(default=False)
    notes_complete = models.BooleanField(default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="qa_checklists_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        state = "done" if self.is_complete else "pending"
        return f"QA for deployment {self.deployment_id}: {state}"

    @property
    def is_complete(self) -> bool:
        return all([
            self.scope_approved,
            self.roadmap_completed,
            self.no_blocking_tickets,
            self.url_reachable,
            self.client_page_reviewed,
            self.notes_complete,
        ])
