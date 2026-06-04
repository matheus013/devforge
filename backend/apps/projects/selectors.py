from __future__ import annotations

from django.db.models import QuerySet

from apps.organizations.selectors import organizations_for_user

from .models import Project


def projects_for_user(user) -> QuerySet[Project]:
    return Project.objects.filter(organization__in=organizations_for_user(user)).select_related(
        "organization", "created_by"
    )
