from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from apps.agents.registry import configured_agents
from apps.agents.services.codex_handoff import request_codex_handoff, resolve_project_with_codex
from apps.organizations.selectors import organizations_for_user
from apps.projects.selectors import projects_for_user

from .models import AgentRun
from .serializers import AgentRunSerializer, CodexHandoffSerializer


class AgentRunViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AgentRunSerializer

    def get_queryset(self):
        return AgentRun.objects.filter(organization__in=organizations_for_user(self.request.user))

    @action(detail=False, methods=["get"])
    def registry(self, request):
        return Response({"mode": "codex_local", "agents": configured_agents()})

    @action(detail=False, methods=["post"], url_path="request-codex")
    def request_codex(self, request):
        serializer = CodexHandoffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(
            projects_for_user(request.user), id=serializer.validated_data["project_id"]
        )
        run = request_codex_handoff(
            project=project,
            objective=serializer.validated_data["objective"],
            requested_by=request.user,
        )
        return Response(AgentRunSerializer(run).data, status=201)

    @action(detail=False, methods=["post"], url_path="resolve-project")
    def resolve_project(self, request):
        serializer = CodexHandoffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(
            projects_for_user(request.user), id=serializer.validated_data["project_id"]
        )
        run = resolve_project_with_codex(
            project=project,
            objective=serializer.validated_data["objective"],
            requested_by=request.user,
        )
        return Response(AgentRunSerializer(run).data, status=201)
