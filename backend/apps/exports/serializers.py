from rest_framework import serializers

from apps.organizations.selectors import organizations_for_user

from .models import CodeExportRequest


class CodeExportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeExportRequest
        fields = [
            "id",
            "organization",
            "project",
            "status",
            "requested_by",
            "approved_by",
            "package_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "requested_by",
            "approved_by",
            "package_url",
            "created_at",
            "updated_at",
        ]

    def validate_project(self, project):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        return project
