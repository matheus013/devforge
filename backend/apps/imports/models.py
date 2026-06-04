from __future__ import annotations

from django.db import models


class ProjectImport(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="imports"
    )
    git_url = models.URLField(blank=True)
    zip_file_name = models.CharField(max_length=240, blank=True)
    status = models.CharField(max_length=30, default="analyzed")
    detected_structure = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Import for {self.project_id}: {self.status}"


class ProjectAssessment(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="assessments"
    )
    project_import = models.ForeignKey(
        ProjectImport, on_delete=models.SET_NULL, null=True, blank=True
    )
    stack = models.JSONField(default=list)
    frameworks = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    score = models.PositiveSmallIntegerField(default=70)
    recommendation = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Assessment for {self.project_id}: {self.score}"
