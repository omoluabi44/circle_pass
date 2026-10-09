from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0029_seed_exact_categories'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE core_event CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            reverse_sql=migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            sql="ALTER TABLE core_blogpost CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            reverse_sql=migrations.RunSQL.noop
        ),
    ]
