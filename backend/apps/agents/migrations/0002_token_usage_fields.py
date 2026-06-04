from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("agents", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="agentrun",
            name="provider",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="agentrun",
            name="model_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="agentrun",
            name="input_tokens",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="agentrun",
            name="output_tokens",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="agentrun",
            name="total_tokens",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="agentrun",
            name="token_usage_source",
            field=models.CharField(default="unavailable", max_length=30),
        ),
        migrations.AddField(
            model_name="agentrun",
            name="currency",
            field=models.CharField(default="USD", max_length=8),
        ),
    ]
