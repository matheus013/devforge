from rest_framework import viewsets

from apps.organizations.selectors import organizations_for_user

from .models import Ticket
from .serializers import TicketSerializer


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer

    def get_queryset(self):
        return Ticket.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project")

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        serializer.save(organization=project.organization, source="manual")
