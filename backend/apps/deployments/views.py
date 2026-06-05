from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.organizations.selectors import organizations_for_user

from .models import Deployment
from .serializers import DeploymentSerializer


class _SetStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[Deployment.Status.READY, Deployment.Status.DISABLED, Deployment.Status.FAILED]
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class DeploymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeploymentSerializer

    def get_queryset(self):
        return Deployment.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("project", "organization")

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        if request.user.role not in ("admin", "staff"):
            return Response(
                {"detail": "Apenas administradores podem alterar o status de implantacoes."},
                status=status.HTTP_403_FORBIDDEN,
            )
        deployment = self.get_object()
        serializer = _SetStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deployment.status = serializer.validated_data["status"]
        if "notes" in serializer.validated_data:
            deployment.notes = serializer.validated_data["notes"]
        deployment.save(update_fields=["status", "notes", "updated_at"])
        return Response(DeploymentSerializer(deployment).data)
