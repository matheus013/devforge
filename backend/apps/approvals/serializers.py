from rest_framework import serializers

from apps.organizations.selectors import organizations_for_user

from .models import Approval
from .services import record_approval


class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Approval
        fields = [
            "id",
            "organization",
            "project",
            "plan",
            "decision",
            "comment",
            "decided_by",
            "created_at",
        ]
        read_only_fields = ["id", "organization", "decided_by", "created_at"]

    def create(self, validated_data: dict) -> Approval:
        return record_approval(user=self.context["request"].user, **validated_data)

    def validate(self, attrs):
        project = attrs["project"]
        plan = attrs["plan"]
        if plan.project_id != project.id:
            raise serializers.ValidationError("Plan must belong to the selected project.")
        if not (
            organizations_for_user(self.context["request"].user)
            .filter(id=project.organization_id)
            .exists()
        ):
            raise serializers.ValidationError("Project is not available for this user.")
        decision = attrs.get("decision")
        comment = attrs.get("comment", "").strip()
        if decision in ("changes_requested", "rejected") and not comment:
            raise serializers.ValidationError(
                {"comment": "Um comentario e obrigatorio ao solicitar mudancas ou rejeitar."}
            )
        return attrs
