# Generated manually for local DevForge MVP deployment previews.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("organizations", "0001_initial"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Deployment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("environment", models.CharField(default="local-preview", max_length=40)),
                (
                    "status",
                    models.CharField(
                        choices=[("ready", "Ready"), ("failed", "Failed"), ("disabled", "Disabled")],
                        default="ready",
                        max_length=30,
                    ),
                ),
                ("url", models.URLField(max_length=500)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="organizations.organization",
                    ),
                ),
                (
                    "project",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="deployment",
                        to="projects.project",
                    ),
                ),
            ],
            options={"ordering": ["-updated_at"]},
        ),
    ]
