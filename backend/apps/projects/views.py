from __future__ import annotations

from rest_framework import mixins, viewsets

from apps.organizations.selectors import organizations_for_user

from .models import ProjectMessage, ProjectPlan, ProjectStage
from .selectors import projects_for_user
from .serializers import (
    ProjectMessageSerializer,
    ProjectPlanSerializer,
    ProjectSerializer,
    ProjectStageSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return projects_for_user(self.request.user).order_by("-created_at")


class ProjectMessageViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ProjectMessageSerializer

    def get_queryset(self):
        return ProjectMessage.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).order_by("created_at")


class ProjectPlanViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectPlanSerializer

    def get_queryset(self):
        return ProjectPlan.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project")

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        serializer.save(organization=project.organization)


class ProjectStageViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectStageSerializer

    def get_queryset(self):
        return ProjectStage.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project")

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        serializer.save(organization=project.organization)
