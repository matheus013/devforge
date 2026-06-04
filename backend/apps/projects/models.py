from __future__ import annotations

from django.conf import settings
from django.db import models


class Project(models.Model):
    class Type(models.TextChoices):
        NEW_BUILD = "new_build", "New build"
        IMPORTED_PROJECT = "imported_project", "Imported project"
        MAINTENANCE = "maintenance", "Maintenance"
        AUDIT_ONLY = "audit_only", "Audit only"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PLANNING = "planning", "Planning"
        WAITING_APPROVAL = "waiting_approval", "Waiting approval"
        ACTIVE = "active", "Active"
        BLOCKED = "blocked", "Blocked"
        EXPORTED = "exported", "Exported"

    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=40, choices=Type.choices, default=Type.NEW_BUILD)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.DRAFT)
    stack = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class ProjectMessage(models.Model):
    class Sender(models.TextChoices):
        CLIENT = "client", "Client"
        AGENT = "agent", "Agent"
        STAFF = "staff", "Staff"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=20, choices=Sender.choices)
    body = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.sender} message for {self.project_id}"


class ProjectPlan(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="plan")
    summary = models.TextField()
    features = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    stack = models.JSONField(default=dict)
    roadmap = models.JSONField(default=list)
    estimate = models.JSONField(default=dict)
    acceptance_criteria = models.JSONField(default=list)
    status = models.CharField(max_length=30, default="waiting_approval")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Plan for {self.project_id}: {self.status}"


class ProjectStage(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "Todo"
        IN_PROGRESS = "in_progress", "In progress"
        BLOCKED = "blocked", "Blocked"
        DONE = "done", "Done"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="stages")
    name = models.CharField(max_length=80)
    order = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    blocker = models.TextField(blank=True)
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("project", "order")

    def __str__(self) -> str:
        return f"{self.project_id} stage {self.order}: {self.name}"
