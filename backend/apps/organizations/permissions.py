from __future__ import annotations

from rest_framework.permissions import BasePermission

from .selectors import organizations_for_user


class IsOrganizationMember(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        organization = getattr(obj, "organization", obj)
        return organizations_for_user(request.user).filter(id=organization.id).exists()
