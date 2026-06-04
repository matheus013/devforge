from rest_framework import serializers

from .models import AgentRun


class AgentRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentRun
        fields = [
            "id",
            "organization",
            "project",
            "skill",
            "status",
            "input",
            "output",
            "provider",
            "model_name",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "token_usage_source",
            "currency",
            "estimated_cost",
            "logs",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CodexHandoffSerializer(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    project_id = serializers.IntegerField(write_only=True)
    objective = serializers.CharField(min_length=8, max_length=1000)
