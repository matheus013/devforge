from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.organizations.selectors import organizations_for_user

from .models import Deployment, QAChecklist
from .serializers import DeploymentSerializer, QAChecklistSerializer
from .services import refresh_qa_checklist


class _SetStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[Deployment.Status.READY, Deployment.Status.DISABLED, Deployment.Status.FAILED]
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    admin_url = serializers.URLField(required=False, allow_blank=True, max_length=500)


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
        new_status = serializer.validated_data["status"]

        if new_status == Deployment.Status.READY:
            checklist = refresh_qa_checklist(deployment)
            if not checklist.is_complete:
                return Response(
                    {
                        "detail": (
                        "O checklist de QA deve estar completo antes de ativar a implantacao."
                    ),
                        "qa_checklist": QAChecklistSerializer(checklist).data,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        deployment.status = new_status
        if "notes" in serializer.validated_data:
            deployment.notes = serializer.validated_data["notes"]
        if "admin_url" in serializer.validated_data:
            deployment.admin_url = serializer.validated_data["admin_url"]
        deployment.save(update_fields=["status", "notes", "admin_url", "updated_at"])
        return Response(DeploymentSerializer(deployment).data)

    @action(detail=True, methods=["get", "patch"], url_path="qa-checklist")
    def qa_checklist(self, request, pk=None):
        if request.user.role not in ("admin", "staff"):
            return Response(
                {"detail": "Apenas administradores podem acessar o checklist de QA."},
                status=status.HTTP_403_FORBIDDEN,
            )
        deployment = self.get_object()
        checklist = refresh_qa_checklist(deployment)

        if request.method == "PATCH":
            manual_fields = ["url_reachable", "client_page_reviewed", "notes_complete"]
            for field in manual_fields:
                if field in request.data:
                    setattr(checklist, field, bool(request.data[field]))
            checklist.updated_by = request.user
            checklist.save(
                update_fields=manual_fields + ["updated_by", "updated_at"]
            )

        return Response(QAChecklistSerializer(checklist).data)


class QAChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QAChecklistSerializer

    def get_queryset(self):
        return QAChecklist.objects.filter(
            organization__in=organizations_for_user(self.request.user)
        ).select_related("deployment", "updated_by")
