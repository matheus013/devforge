from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from apps.agents.registry import ALLOWED_RUNNERS, active_runner, configured_agents
from apps.agents.services.claude_code_handoff import (
    request_claude_code_handoff,
    resolve_project_with_claude_code,
)
from apps.agents.services.codex_handoff import request_codex_handoff, resolve_project_with_codex
from apps.organizations.selectors import organizations_for_user
from apps.projects.selectors import projects_for_user

from .models import AgentRun
from .serializers import AgentHandoffSerializer, AgentRunSerializer

_REQUEST_HANDLERS = {
    "codex": request_codex_handoff,
    "claude-code": request_claude_code_handoff,
}

_RESOLVE_HANDLERS = {
    "codex": resolve_project_with_codex,
    "claude-code": resolve_project_with_claude_code,
}


class AgentRunViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AgentRunSerializer

    def get_queryset(self):
        return AgentRun.objects.filter(organization__in=organizations_for_user(self.request.user))

    @action(detail=False, methods=["get"])
    def registry(self, request):
        return Response({
            "active_runner": active_runner(),
            "allowed_runners": ALLOWED_RUNNERS,
            "agents": configured_agents(),
        })

    @action(detail=False, methods=["post"], url_path="request-agent")
    def request_agent(self, request):
        serializer = AgentHandoffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        runner = serializer.validated_data["runner"]
        project = get_object_or_404(
            projects_for_user(request.user), id=serializer.validated_data["project_id"]
        )
        run = _REQUEST_HANDLERS[runner](
            project=project,
            objective=serializer.validated_data["objective"],
            requested_by=request.user,
        )
        return Response(AgentRunSerializer(run).data, status=201)

    @action(detail=False, methods=["post"], url_path="resolve-project")
    def resolve_project(self, request):
        serializer = AgentHandoffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        runner = serializer.validated_data["runner"]
        project = get_object_or_404(
            projects_for_user(request.user), id=serializer.validated_data["project_id"]
        )
        run = _RESOLVE_HANDLERS[runner](
            project=project,
            objective=serializer.validated_data["objective"],
            requested_by=request.user,
        )
        return Response(AgentRunSerializer(run).data, status=201)

    # Backward-compatible endpoint — always routes to Codex
    @action(detail=False, methods=["post"], url_path="request-codex")
    def request_codex(self, request):
        serializer = AgentHandoffSerializer(data={**request.data, "runner": "codex"})
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
