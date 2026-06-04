from rest_framework import viewsets

from apps.organizations.selectors import organizations_for_user

from .models import CodeExportRequest
from .serializers import CodeExportRequestSerializer


class CodeExportRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CodeExportRequestSerializer

    def get_queryset(self):
        return CodeExportRequest.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project")

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        serializer.save(organization=project.organization, requested_by=self.request.user)
