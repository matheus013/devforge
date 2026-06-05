from rest_framework import serializers

from .models import Deployment, QAChecklist


class DeploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deployment
        fields = [
            "id",
            "organization",
            "project",
            "environment",
            "status",
            "url",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QAChecklistSerializer(serializers.ModelSerializer):
    is_complete = serializers.SerializerMethodField()

    class Meta:
        model = QAChecklist
        fields = [
            "id",
            "deployment",
            "scope_approved",
            "roadmap_completed",
            "no_blocking_tickets",
            "url_reachable",
            "client_page_reviewed",
            "notes_complete",
            "is_complete",
            "updated_by",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "deployment",
            "scope_approved",
            "roadmap_completed",
            "no_blocking_tickets",
            "is_complete",
            "updated_at",
        ]

    def get_is_complete(self, obj: QAChecklist) -> bool:
        return obj.is_complete
