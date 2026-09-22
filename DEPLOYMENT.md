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

## Resource usage

What actually uses RAM, and what to do if it worries you:

- **`app` at runtime** (the Next.js server): ~150-200MB RSS in normal use,
  growing a bit with concurrent users/uploads. Capped at 512M in
  `docker-compose.yml` (`deploy.resources.limits.memory`) and given a Node
  heap ceiling (`NODE_OPTIONS=--max-old-space-size=384`) so it can't grow
  past that on its own - without the ceiling, V8 sizes its heap off the
  *host's* total memory, which is what makes `docker stats` show a
  container "wanting" several GB when it isn't actually using them.
- **`db` at runtime** (Postgres): ~30-50MB for a install this size, with
  `shared_buffers`/`max_connections` turned down from Postgres's defaults
  (128MB/100) to 64MB/30 and a 256M container limit.
- **The build** (`docker compose build`, or `up --build`): the one real
  spike - compiling and type-checking a Next.js app needs real memory,
  capped at 2GB in the Dockerfile (`NODE_OPTIONS` in the `builder` stage) so
  it fails loudly on a too-small box instead of hanging it via swap
  thrashing. This is a one-time cost per deploy, not a steady drain -
  budget 2GB+ free RAM for it, then the app settles back to the numbers
  above once it's running.

Raise any of these (`docker-compose.yml`'s `deploy.resources.limits.memory`
and `NODE_OPTIONS`, or the Dockerfile's build-time `NODE_OPTIONS`) if your
install is bigger than this or you see OOM kills
(`docker inspect ascend-app-1 --format '{{.State.OOMKilled}}'`).

**If your host itself looks like it's using multiple GB and the two
containers above don't add up to it, look at Docker itself before the
app** - two real, unrelated sources we've hit in practice, neither caused
by Ascend's containers:

- **`dockerd`'s own memory.** After a lot of image builds in one uptime
  (rebuilding repeatedly while developing, CI doing many builds, etc.), the
  Docker daemon process itself can end up holding on to a GB or more of RSS
  that it never gives back to the OS - this is Docker/its allocator, not a
  leak in the app. `ps aux --sort=-rss | head` will show `dockerd` as the
  top consumer if this is what's happening. Fix: `sudo systemctl restart
  docker` (containers come back up on their own via `restart:
  unless-stopped`, a few seconds of downtime, no live-restore needed for
  that). We saw this reclaim ~1.5GB on a 3.8GB VM.
- **Stale build cache**, from the same repeated-builds situation - each
  `docker compose build`/`up --build` leaves layers behind that only get
  reclaimed on request. Check with `docker system df` (the `Build Cache`
  row); clear with `docker builder prune -af`. We've seen this alone hit
  3+GB of disk (not RAM) after a day of iterating on the Dockerfile.
- **The `migrate` image**, if you're inspecting `docker images` rather than
  `docker stats`: it now installs only `prisma`+`dotenv` (not the full
  ~1.4GB app dependency tree) specifically to keep this small - if you see
  it back in GB territory, something upstream of it in the Dockerfile
  changed and pulled it back onto `deps`/`builder`.

