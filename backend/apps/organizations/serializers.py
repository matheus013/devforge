from rest_framework import serializers

from .models import Organization, OrganizationMember


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "created_at"]
        read_only_fields = ["id", "created_at"]


class OrganizationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationMember
        fields = ["id", "organization", "user", "role", "created_at"]
        read_only_fields = ["id", "created_at"]
