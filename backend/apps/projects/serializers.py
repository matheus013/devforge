from __future__ import annotations

from rest_framework import serializers

from apps.organizations.selectors import organizations_for_user

from .models import Project, ProjectMessage, ProjectPlan, ProjectStage
from .services import create_project_with_plan, handle_project_message


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "type",
            "status",
            "stack",
            "has_database",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_by", "created_at", "updated_at"]

    def create(self, validated_data: dict) -> Project:
        return create_project_with_plan(user=self.context["request"].user, **validated_data)

    def validate_organization(self, organization):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=organization.id)
            .exists()
        ):
            raise serializers.ValidationError("Organization is not available for this user.")
        return organization


class ProjectMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMessage
        fields = ["id", "organization", "project", "sender", "body", "metadata", "created_at"]
        read_only_fields = ["id", "organization", "sender", "metadata", "created_at"]

    def create(self, validated_data: dict) -> ProjectMessage:
        return handle_project_message(user=self.context["request"].user, **validated_data)

    def validate_project(self, project):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        return project


class ProjectPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPlan
        fields = [
            "id",
            "organization",
            "project",
            "summary",
            "features",
            "risks",
            "stack",
            "roadmap",
            "estimate",
            "acceptance_criteria",
            "status",
            "version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "version", "created_at", "updated_at"]

    def validate_project(self, project):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        return project


class ProjectStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectStage
        fields = [
            "id",
            "organization",
            "project",
            "name",
            "order",
            "status",
            "blocker",
            "starts_at",
            "ends_at",
        ]
        read_only_fields = ["id", "organization"]

    def validate_project(self, project):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        return project
