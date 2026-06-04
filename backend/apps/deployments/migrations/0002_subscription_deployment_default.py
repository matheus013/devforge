# Generated manually for subscription deployment URLs.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("deployments", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="deployment",
            name="environment",
            field=models.CharField(default="subscription-deployment", max_length=40),
        ),
    ]
