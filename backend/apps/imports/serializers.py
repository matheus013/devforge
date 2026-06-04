from rest_framework import serializers

from apps.organizations.selectors import organizations_for_user

from .models import ProjectAssessment, ProjectImport
from .services import create_import_with_assessment


class ProjectImportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectImport
        fields = [
            "id",
            "organization",
            "project",
            "git_url",
            "zip_file_name",
            "status",
            "detected_structure",
            "created_at",
        ]
        read_only_fields = ["id", "organization", "status", "detected_structure", "created_at"]

    def create(self, validated_data: dict) -> ProjectImport:
        return create_import_with_assessment(**validated_data)

    def validate_project(self, project):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        return project


class ProjectAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectAssessment
        fields = [
            "id",
            "organization",
            "project",
            "project_import",
            "stack",
            "frameworks",
            "risks",
            "score",
            "recommendation",
            "created_at",
        ]
        read_only_fields = ["id", "organization", "created_at"]
