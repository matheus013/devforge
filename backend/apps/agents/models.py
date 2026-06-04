from __future__ import annotations

from decimal import Decimal

from django.db import models


class AgentRun(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="agent_runs"
    )
    skill = models.CharField(max_length=80)
    status = models.CharField(max_length=30, default="completed")
    input = models.JSONField(default=dict)
    output = models.JSONField(default=dict)
    provider = models.CharField(max_length=80, blank=True)
    model_name = models.CharField(max_length=120, blank=True)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    token_usage_source = models.CharField(max_length=30, default="unavailable")
    currency = models.CharField(max_length=8, default="USD")
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    logs = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.skill} run for {self.project_id}"
