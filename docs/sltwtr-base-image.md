# SLTWTR sandbox base image

All team sandboxes boot from a single preconfigured base image. Because Vercel
Sandbox **cannot pull a private container image** (e.g. from GHCR) — it only
offers Vercel's Amazon Linux 2023 base plus node/python runtimes — the team
image is reproduced as a **Vercel snapshot** instead of a Docker/GHCR image.

## How it works

- `scripts/sltwtr-base-image.commands.ts` — the single source of truth: an
  ordered list of shell commands that bake the team toolchain into the image.
  Translate each `RUN` step from the team's existing GHCR Dockerfile into an
  entry here (use `dnf`, not `apt-get` — the base is Amazon Linux 2023).
- `scripts/build-sltwtr-base-snapshot.ts` — runs those commands on top of the
  current base snapshot via `refreshBaseSnapshot` and prints a new snapshot id.
- `VERCEL_SANDBOX_BASE_SNAPSHOT_ID` — every sandbox is created from this
  snapshot (`apps/web/lib/sandbox/config.ts`). Setting it to the new id rolls
  the whole team onto the new image.

## Building / updating the image (admin / CI)

```bash
# Requires the Vercel Sandbox credentials the SDK reads (same as production).
pnpm sandbox:snapshot-base:sltwtr
# Optional: start from a specific snapshot or raise the per-command timeout
pnpm sandbox:snapshot-base:sltwtr -- --from snap_123 --command-timeout-ms 1200000
```

The command prints a new snapshot id. Set it as `VERCEL_SANDBOX_BASE_SNAPSHOT_ID`
in the Vercel project env (and optionally update the default in
`apps/web/lib/sandbox/config.ts`), then redeploy. Preview deploys and new
sessions will use the new image.

## Notes

- Commands must be idempotent and non-interactive; the build aborts on the
  first non-zero exit.
- An empty command manifest produces a snapshot identical to the base — a safe
  way to verify the pipeline before adding tooling.
- This is an ops/CLI step, intentionally not exposed in the app UI.
