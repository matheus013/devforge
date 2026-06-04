from django.contrib import admin

from .models import AgentRun


@admin.register(AgentRun)
class AgentRunAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "skill",
        "status",
        "organization",
        "project",
        "estimated_cost",
        "created_at",
    ]
    list_filter = ["skill", "status", "organization", "created_at"]
    search_fields = ["skill", "project__name", "organization__name"]
    readonly_fields = ["created_at"]
    date_hierarchy = "created_at"
