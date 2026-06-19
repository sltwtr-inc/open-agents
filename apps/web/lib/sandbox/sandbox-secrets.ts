import { getAllowedRepo } from "@/lib/db/org-github";
import { appendSecretAudit, getResolvedSecretsForRepo } from "@/lib/db/secrets";
import { isSecretsEncryptionConfigured } from "@/lib/secrets/crypto";

interface ResolveSandboxSecretsParams {
  owner?: string | null;
  repo?: string | null;
  sessionId: string;
  actorUserId?: string | null;
  /**
   * When true, record an `inject` audit entry (key names only). Set this only
   * on the path that actually hands the env to the agent's commands so the
   * audit log isn't duplicated across setup paths.
   */
  audit?: boolean;
}

/**
 * Resolve the env map to inject into a session's sandbox. Returns undefined
 * (inject nothing) unless: secrets encryption is configured, the repo is on the
 * allowlist, and the repo has explicitly opted in (`secretsEnabled`). Never
 * throws — a failure here must not break provisioning or leak.
 */
export async function resolveSandboxSecrets(
  params: ResolveSandboxSecretsParams,
): Promise<Record<string, string> | undefined> {
  if (!(params.owner && params.repo)) {
    return undefined;
  }
  if (!isSecretsEncryptionConfigured()) {
    return undefined;
  }

  try {
    const allowedRepo = await getAllowedRepo(params.owner, params.repo);
    if (!allowedRepo || !allowedRepo.secretsEnabled) {
      return undefined;
    }

    const secrets = await getResolvedSecretsForRepo(allowedRepo.id);
    const keys = Object.keys(secrets);
    if (keys.length === 0) {
      return undefined;
    }

    if (params.audit) {
      await appendSecretAudit({
        actorUserId: params.actorUserId ?? null,
        action: "inject",
        scope: "repo",
        secretKey: keys.sort().join(","),
        allowedRepoId: allowedRepo.id,
        sessionId: params.sessionId,
      });
    }

    return secrets;
  } catch (error) {
    console.error(
      `Failed to resolve sandbox secrets for session ${params.sessionId}:`,
      error,
    );
    return undefined;
  }
}
