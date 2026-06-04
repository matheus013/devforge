from django.contrib import admin

from .models import CodeExportRequest


@admin.register(CodeExportRequest)
class CodeExportRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "status", "organization", "project", "requested_by", "created_at"]
    list_filter = ["status", "organization", "created_at"]
    search_fields = ["project__name", "requested_by__email", "package_url"]
    readonly_fields = ["created_at", "updated_at"]
