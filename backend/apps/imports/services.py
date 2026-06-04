from __future__ import annotations

from django.db import transaction

from apps.agents.services.import_analyzer import analyze_import

from .models import ProjectAssessment, ProjectImport


@transaction.atomic
def create_import_with_assessment(
    *, project, git_url: str = "", zip_file_name: str = ""
) -> ProjectImport:
    project_import = ProjectImport.objects.create(
        organization=project.organization,
        project=project,
        git_url=git_url,
        zip_file_name=zip_file_name,
        detected_structure={"executed_code": False, "source": git_url or zip_file_name},
    )
    report = analyze_import(project_import)
    ProjectAssessment.objects.create(
        organization=project.organization,
        project=project,
        project_import=project_import,
        **report,
    )
    return project_import
