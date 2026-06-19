/**
 * Build the SLTWTR sandbox base snapshot from the command manifest.
 *
 * Runs the ordered commands in `sltwtr-base-image.commands.ts` on top of the
 * currently configured base snapshot and prints the new snapshot id. An admin
 * runs this (locally or in CI, with the Vercel Sandbox credentials the SDK
 * reads), then sets `VERCEL_SANDBOX_BASE_SNAPSHOT_ID` to the new id so every
 * sandbox boots from the team image.
 *
 * Usage:
 *   pnpm sandbox:snapshot-base:sltwtr
 *   pnpm sandbox:snapshot-base:sltwtr -- --from snap_123 --command-timeout-ms 1200000
 */

import {
  DEFAULT_BASE_SNAPSHOT_COMMAND_TIMEOUT_MS,
  refreshBaseSnapshot,
} from "@open-agents/sandbox/vercel";
import {
  DEFAULT_SANDBOX_BASE_SNAPSHOT_ID,
  DEFAULT_SANDBOX_PORTS,
  DEFAULT_SANDBOX_TIMEOUT_MS,
} from "../apps/web/lib/sandbox/config.ts";
import { SLTWTR_BASE_IMAGE_COMMANDS } from "./sltwtr-base-image.commands.ts";

const SANDBOX_BASE_SNAPSHOT_CONFIG_PATH = "apps/web/lib/sandbox/config.ts";

interface CliOptions {
  baseSnapshotId?: string;
  commandTimeoutMs?: number;
}

function requireOptionValue(
  argv: string[],
  index: number,
  option: string,
): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}.`);
  }
  return value;
}

function parsePositiveNumber(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive number.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from") {
      options.baseSnapshotId = requireOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === "--command-timeout-ms") {
      options.commandTimeoutMs = parsePositiveNumber(
        requireOptionValue(argv, index, arg),
        arg,
      );
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (SLTWTR_BASE_IMAGE_COMMANDS.length === 0) {
    console.warn(
      "No commands in sltwtr-base-image.commands.ts — the snapshot will match the current base (no tooling added).",
    );
  }

  console.log(
    `Building base snapshot with ${SLTWTR_BASE_IMAGE_COMMANDS.length} command(s)…`,
  );

  const result = await refreshBaseSnapshot({
    baseSnapshotId: options.baseSnapshotId ?? DEFAULT_SANDBOX_BASE_SNAPSHOT_ID,
    commands: SLTWTR_BASE_IMAGE_COMMANDS,
    sandboxTimeoutMs: DEFAULT_SANDBOX_TIMEOUT_MS,
    commandTimeoutMs:
      options.commandTimeoutMs ?? DEFAULT_BASE_SNAPSHOT_COMMAND_TIMEOUT_MS,
    ports: DEFAULT_SANDBOX_PORTS,
    log: (message) => console.log(message),
  });

  console.log("");
  console.log(`New snapshot id: ${result.snapshotId}`);
  console.log(`Started from snapshot: ${result.sourceSnapshotId ?? "(base)"}`);
  console.log("");
  console.log(
    `Next: set VERCEL_SANDBOX_BASE_SNAPSHOT_ID="${result.snapshotId}" (and update ${SANDBOX_BASE_SNAPSHOT_CONFIG_PATH} default if desired), then redeploy.`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
