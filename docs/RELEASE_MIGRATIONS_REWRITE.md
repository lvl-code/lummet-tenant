# Release v22.39: migrations rewrite

See `docs/MIGRATIONS.md` and `docs/PLATFORM_UPGRADES.md` section 77.

Deploy: no database change is required. To bring `levelcasino-db` up to date run `0013_ai_assistant.sql` and `0014_platform_operations.sql` (`gh workflow run d1-migrate-file.yml -f file=0013_ai_assistant.sql`). Do not run the seed files on live databases.

Set the `ADMIN_PASSWORD` secret before using `seed-admin.yml`.
