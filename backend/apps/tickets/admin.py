from django.contrib import admin

from .models import Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "title",
        "organization",
        "project",
        "priority",
        "status",
        "source",
        "created_at",
    ]
    list_filter = ["priority", "status", "source", "organization", "created_at"]
    search_fields = ["title", "description", "project__name", "organization__name"]
    readonly_fields = ["created_at", "updated_at"]
