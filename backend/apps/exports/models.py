from __future__ import annotations

from django.conf import settings
from django.db import models


class CodeExportRequest(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="export_requests"
    )
    status = models.CharField(max_length=30, default="requested")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="export_requests"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_exports",
    )
    package_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Export request {self.project_id}: {self.status}"
