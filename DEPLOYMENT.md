# Deployment notes

Everything here assumes the standard `docker compose up -d --build` setup
from the README. This file covers the operational bits that don't fit
there: reverse proxy + HTTPS, backups, healthchecks, and metrics.

## Reverse proxy + automatic HTTPS

Ascend itself only speaks plain HTTP on port 3000. Put a reverse proxy in
front for TLS - two common options:

### Caddy (simplest - automatic Let's Encrypt)

```
# Caddyfile
workout.example.com {
    reverse_proxy localhost:3000
}
```

That's it - Caddy handles the certificate and renewal on its own. Run it
either as a system service or as its own container on the same Docker
network as the `app` service (in which case use `reverse_proxy app:3000`
instead of `localhost:3000`).

### Traefik (if you're already running it for other services)

```yaml
# add to the `app` service in docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.ascend.rule=Host(`workout.example.com`)"
  - "traefik.http.routers.ascend.tls.certresolver=letsencrypt"
  - "traefik.http.services.ascend.loadbalancer.server.port=3000"
networks:
  - traefik
```

Either way: point DNS at your server, make sure port 80/443 reach it, and
set `AUTH_TRUST_HOST=true` (already the default in `docker-compose.yml`) so
NextAuth trusts the `Host` header the proxy forwards.

## Automatic database migrations

`docker compose up -d` runs a one-shot `migrate` service (`prisma migrate
deploy`) before `app` starts - a fresh `docker pull` + `up` always ends up
on the current schema without any manual `docker compose exec` step.

## Healthcheck

`GET /api/health` checks it can actually reach the database (not just that
the Node process is up) and returns `{"status":"ok"}` or a 503. Both the
Dockerfile's `HEALTHCHECK` and the `app` service in `docker-compose.yml`
already use it - `docker compose ps` will show `unhealthy` if the database
connection breaks.

## Backups

```bash
./scripts/backup.sh                                    # dumps DB + uploads into ./backups/
./scripts/restore.sh backups/db-<ts>.sql.gz backups/uploads-<ts>.tar.gz
```

`restore.sh` is destructive (drops and recreates the database) and asks for
confirmation first. Put `backup.sh` in cron for unattended daily backups -
see the comment at the top of the script for an example crontab line.

## Prometheus metrics

Set `METRICS_TOKEN` in your `.env` to enable `GET /api/metrics` (returns
404 while unset, so a fresh instance never exposes usage counts by
accident). Scrape it with either an `Authorization: Bearer <token>` header
or a `?token=<token>` query param:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: ascend
    metrics_path: /api/metrics
    params:
      token: ["your-metrics-token"]
    static_configs:
      - targets: ["workout.example.com"]
```

Exposes `ascend_users_total`, `ascend_workout_sessions_total`,
`ascend_workout_sets_total`, `ascend_groups_total`, and
`ascend_process_uptime_seconds`.

## Rate limits

Login/registration limits are tunable via env vars (defaults shown):

```
LOGIN_RATE_LIMIT_MAX=10
LOGIN_RATE_LIMIT_WINDOW_MS=900000
REGISTER_RATE_LIMIT_MAX=5
REGISTER_RATE_LIMIT_WINDOW_MS=3600000
```
