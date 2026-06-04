from __future__ import annotations

from rest_framework import viewsets

from .models import OrganizationMember
from .selectors import organizations_for_user
from .serializers import OrganizationMemberSerializer, OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        return organizations_for_user(self.request.user).order_by("name")

    def perform_create(self, serializer):
        organization = serializer.save()
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=self.request.user,
            defaults={"role": OrganizationMember.Role.OWNER},
        )


class OrganizationMemberViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationMemberSerializer

    def get_queryset(self):
        orgs = organizations_for_user(self.request.user)
        return OrganizationMember.objects.filter(organization__in=orgs).order_by("id")
