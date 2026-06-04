from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.views import RegisterView, UserViewSet
from apps.agents.views import AgentRunViewSet
from apps.approvals.views import ApprovalViewSet
from apps.deployments.views import DeploymentViewSet
from apps.exports.views import CodeExportRequestViewSet
from apps.imports.views import ProjectAssessmentViewSet, ProjectImportViewSet
from apps.organizations.views import OrganizationMemberViewSet, OrganizationViewSet
from apps.projects.views import (
    ProjectMessageViewSet,
    ProjectPlanViewSet,
    ProjectStageViewSet,
    ProjectViewSet,
)
from apps.tickets.views import TicketViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("organizations", OrganizationViewSet, basename="organizations")
router.register("organization-members", OrganizationMemberViewSet, basename="organization-members")
router.register("projects", ProjectViewSet, basename="projects")
router.register("messages", ProjectMessageViewSet, basename="messages")
router.register("plans", ProjectPlanViewSet, basename="plans")
router.register("stages", ProjectStageViewSet, basename="stages")
router.register("approvals", ApprovalViewSet, basename="approvals")
router.register("tickets", TicketViewSet, basename="tickets")
router.register("imports", ProjectImportViewSet, basename="imports")
router.register("assessments", ProjectAssessmentViewSet, basename="assessments")
router.register("exports", CodeExportRequestViewSet, basename="exports")
router.register("agent-runs", AgentRunViewSet, basename="agent-runs")
router.register("deployments", DeploymentViewSet, basename="deployments")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include(router.urls)),
]
