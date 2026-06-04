from __future__ import annotations

from django.db.models import QuerySet

from .models import Organization


def organizations_for_user(user) -> QuerySet[Organization]:
    if user.is_staff or getattr(user, "role", "") in {"admin", "staff"}:
        return Organization.objects.all()
    return Organization.objects.filter(members__user=user).distinct()
