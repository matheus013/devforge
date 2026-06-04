from django.contrib import admin

from .models import Project, ProjectMessage, ProjectPlan, ProjectStage


class ProjectStageInline(admin.TabularInline):
    model = ProjectStage
    extra = 0


class ProjectPlanInline(admin.StackedInline):
    model = ProjectPlan
    extra = 0
    max_num = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "organization", "type", "status", "created_by", "created_at"]
    list_filter = ["type", "status", "organization", "created_at"]
    search_fields = ["name", "description", "organization__name", "created_by__email"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["organization", "created_by"]
    inlines = [ProjectPlanInline, ProjectStageInline]


@admin.register(ProjectMessage)
class ProjectMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "sender", "organization", "project", "created_at"]
    list_filter = ["sender", "organization", "created_at"]
    search_fields = ["body", "project__name", "organization__name"]
    readonly_fields = ["created_at"]


@admin.register(ProjectPlan)
class ProjectPlanAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "organization", "status", "created_at", "updated_at"]
    list_filter = ["status", "organization", "created_at"]
    search_fields = ["project__name", "summary"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ProjectStage)
class ProjectStageAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "organization", "order", "name", "status"]
    list_filter = ["status", "organization"]
    search_fields = ["project__name", "name", "blocker"]
