from rest_framework import viewsets

from apps.organizations.selectors import organizations_for_user

from .models import ProjectAssessment, ProjectImport
from .serializers import ProjectAssessmentSerializer, ProjectImportSerializer


class ProjectImportViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectImportSerializer

    def get_queryset(self):
        return ProjectImport.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project")


class ProjectAssessmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProjectAssessmentSerializer

    def get_queryset(self):
        return ProjectAssessment.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project")
