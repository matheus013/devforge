from django.contrib import admin

from .models import Approval


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ["id", "decision", "organization", "project", "decided_by", "created_at"]
    list_filter = ["decision", "organization", "created_at"]
    search_fields = ["project__name", "decided_by__email", "comment"]
    readonly_fields = ["created_at"]
