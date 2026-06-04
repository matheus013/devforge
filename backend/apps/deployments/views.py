from rest_framework import viewsets

from apps.organizations.selectors import organizations_for_user

from .models import Deployment
from .serializers import DeploymentSerializer


class DeploymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeploymentSerializer

    def get_queryset(self):
        return Deployment.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project", "organization")
