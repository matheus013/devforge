from __future__ import annotations

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
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.project_id} {self.environment}: {self.status}"
