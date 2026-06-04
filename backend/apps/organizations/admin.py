from django.contrib import admin

from .models import Organization, OrganizationMember


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "slug", "created_at"]
    search_fields = ["name", "slug"]
    readonly_fields = ["created_at"]
    inlines = [OrganizationMemberInline]


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ["id", "organization", "user", "role", "created_at"]
    list_filter = ["role", "organization"]
    search_fields = ["organization__name", "user__email", "user__username"]
    autocomplete_fields = ["organization", "user"]
    readonly_fields = ["created_at"]
