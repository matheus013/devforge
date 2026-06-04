from rest_framework import serializers

from .models import Deployment


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
