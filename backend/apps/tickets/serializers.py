from rest_framework import serializers

from apps.organizations.selectors import organizations_for_user

from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "id",
            "organization",
            "project",
            "title",
            "description",
            "priority",
            "status",
            "source",
            "client_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "source", "created_at", "updated_at"]

    def validate_project(self, project):
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        return project
