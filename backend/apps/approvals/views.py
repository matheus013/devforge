from rest_framework import viewsets

from apps.organizations.selectors import organizations_for_user

from .models import Approval
from .serializers import ApprovalSerializer


class ApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = ApprovalSerializer

    def get_queryset(self):
        return Approval.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project", "plan")
