from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.exports.models import CodeExportRequest
from apps.imports.models import ProjectAssessment
from apps.organizations.models import Organization, OrganizationMember
from apps.projects.services import create_project_with_plan
from apps.tickets.models import Ticket


class Command(BaseCommand):
    help = "Seed DevForge AI with demo users, projects, tickets, assessment, and pending plan."

    def handle(self, *args, **options) -> None:
        user_model = get_user_model()
        admin, _ = user_model.objects.get_or_create(
            email="admin@devforge.local",
            defaults={"username": "admin", "role": "admin", "is_staff": True, "is_superuser": True},
        )
        admin.set_password("devforge123")
        admin.save()

        client, _ = user_model.objects.get_or_create(
            email="client@devforge.local",
            defaults={"username": "client", "role": "client"},
        )
        client.set_password("devforge123")
        client.save()

        client2, _ = user_model.objects.get_or_create(
            email="client2@devforge.local",
            defaults={"username": "client2", "role": "client"},
        )
        client2.set_password("devforge123")
        client2.save()

        operator, _ = user_model.objects.get_or_create(
            email="operator@devforge.local",
            defaults={"username": "operator", "role": "staff", "is_staff": True},
        )
        operator.set_password("devforge123")
        operator.save()

        org, _ = Organization.objects.get_or_create(slug="acme", defaults={"name": "Acme Studio"})
        OrganizationMember.objects.get_or_create(
            organization=org, user=client, defaults={"role": "owner"}
        )
        OrganizationMember.objects.get_or_create(
            organization=org, user=operator, defaults={"role": "admin"}
        )

        beta_org, _ = Organization.objects.get_or_create(
            slug="beta-labs", defaults={"name": "Beta Labs"}
        )
        OrganizationMember.objects.get_or_create(
            organization=beta_org, user=client2, defaults={"role": "owner"}
        )
        OrganizationMember.objects.get_or_create(
            organization=beta_org, user=operator, defaults={"role": "admin"}
        )

        if not org.projects.exists():
            create_project_with_plan(
                user=client,
                organization=org,
                name="Customer Portal",
                description=(
                    "SaaS portal with auth, billing-ready architecture, and admin workflows."
                ),
                type="new_build",
                stack={"frontend": "Next.js", "backend": "Django"},
            )
            imported = create_project_with_plan(
                user=client,
                organization=org,
                name="Legacy Import",
                description="Imported legacy project requiring assessment and migration roadmap.",
                type="imported_project",
                stack={"unknown": True},
            )
            ProjectAssessment.objects.create(
                organization=org,
                project=imported,
                stack=["Next.js", "Django"],
                frameworks=["DRF", "Tailwind"],
                risks=["Secrets scan required", "Dependencies need upgrade"],
                score=76,
                recommendation="Proceed with isolated migration and manual review.",
            )

        if not beta_org.projects.exists():
            create_project_with_plan(
                user=client2,
                organization=beta_org,
                name="Partner Backoffice",
                description=(
                    "Multi-account operations app with approval queues and private tenant data."
                ),
                type="new_build",
                stack={"frontend": "Next.js", "backend": "Django REST Framework"},
            )

        first_project = org.projects.first()
        if first_project:
            Ticket.objects.get_or_create(
                organization=org,
                project=first_project,
                title="Confirm acceptance criteria",
                defaults={
                    "description": "Review generated plan before approval.",
                    "priority": "normal",
                },
            )
            Ticket.objects.get_or_create(
                organization=org,
                project=first_project,
                title="Validate export packaging rules",
                defaults={
                    "description": "Define package format for client handoff.",
                    "priority": "high",
                },
            )
            CodeExportRequest.objects.get_or_create(
                organization=org,
                project=first_project,
                requested_by=client,
                defaults={"status": "requested"},
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo seed complete: admin/client/client2/operator password is devforge123"
            )
        )
