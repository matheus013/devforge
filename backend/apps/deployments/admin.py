from django.contrib import admin

from .models import Deployment


@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "organization", "environment", "status", "url", "updated_at"]
    list_filter = ["status", "environment", "organization", "updated_at"]
    search_fields = ["project__name", "organization__name", "url", "notes"]
    readonly_fields = ["created_at", "updated_at"]
