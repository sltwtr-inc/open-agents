/**
 * SLTWTR sandbox base-image command manifest.
 *
 * Vercel Sandbox cannot pull a private container image (e.g. from GHCR), so the
 * team's preconfigured environment is reproduced as a Vercel *snapshot* instead.
 * This file is the single, reviewable source of truth for what gets baked into
 * that snapshot: an ordered list of shell commands run on top of the current
 * base snapshot by `scripts/build-sltwtr-base-snapshot.ts`.
 *
 * HOW TO POPULATE THIS:
 * Translate each `RUN` step from the team's existing GHCR Dockerfile into an
 * entry below, in order. Notes:
 *   - The Vercel Sandbox base image is Amazon Linux 2023, so use `dnf`
 *     (e.g. `sudo dnf install -y ripgrep jq`) rather than `apt-get`.
 *   - Node and Python runtimes already exist under /vercel/runtimes; install
 *     extra global tooling with the package managers already on PATH.
 *   - Each command must be idempotent and non-interactive (no prompts). The
 *     build aborts on the first non-zero exit.
 *   - Long installs may need a larger `--command-timeout-ms` (see the build
 *     script); the default per-command timeout is 10 minutes.
 *
 * EXAMPLES (uncomment / adapt to the real toolchain — do not ship guesses):
 *   "sudo dnf install -y ripgrep jq",
 *   "npm install -g @anthropic-ai/claude-code",
 *   "corepack enable && corepack prepare pnpm@latest --activate",
 *
 * Leaving this array empty produces a snapshot identical to the current base —
 * a safe no-op that verifies the pipeline before any tooling is added.
 */
export const SLTWTR_BASE_IMAGE_COMMANDS: string[] = [];
