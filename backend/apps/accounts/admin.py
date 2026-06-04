from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

User = get_user_model()


@admin.register(User)
class DevForgeUserAdmin(UserAdmin):
    list_display = ["email", "username", "role", "is_staff", "is_superuser", "is_active"]
    list_filter = ["role", "is_staff", "is_superuser", "is_active"]
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering = ["email"]
    fieldsets = UserAdmin.fieldsets + (("DevForge", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("DevForge", {"fields": ("email", "role")}),)
