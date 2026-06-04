from django.contrib import admin

from .models import ProjectAssessment, ProjectImport


@admin.register(ProjectImport)
class ProjectImportAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "status",
        "organization",
        "project",
        "git_url",
        "zip_file_name",
        "created_at",
    ]
    list_filter = ["status", "organization", "created_at"]
    search_fields = ["project__name", "git_url", "zip_file_name"]
    readonly_fields = ["created_at"]


@admin.register(ProjectAssessment)
class ProjectAssessmentAdmin(admin.ModelAdmin):
    list_display = ["id", "score", "organization", "project", "created_at"]
    list_filter = ["organization", "score", "created_at"]
    search_fields = ["project__name", "recommendation"]
    readonly_fields = ["created_at"]
