from __future__ import annotations

from django.db import models


class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="tickets"
    )
    title = models.CharField(max_length=180)
    description = models.TextField()
    priority = models.CharField(max_length=20, default="normal")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.OPEN)
    source = models.CharField(max_length=40, default="manual")
    client_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
