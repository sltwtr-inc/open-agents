import { getAllowedRepo, getOrgInstallation } from "@/lib/db/org-github";
import { withScopedInstallationOctokit } from "./app";

export type RepoAccessDeniedReason =
  | "not_allowlisted"
  | "no_org_installation"
  | "app_no_access";

export type RequiredRepoUserPermission = "read" | "write";

export type RepoAccessResult =
  | {
      ok: true;
      installationId: number;
      repositoryId: number;
      defaultBranch: string;
    }
  | { ok: false; reason: RepoAccessDeniedReason };

function getGitHubHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if (
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return null;
}

/**
 * Verify access to a repository under the single-org, admin-managed model.
 *
 * Access is governed by org membership, not per-user GitHub permissions: any
 * authenticated team member may use a repository that (1) an admin has added to
 * the allowlist and (2) the org-wide GitHub App installation can reach. The
 * `userId` and `requiredUserPermission` params are accepted for backwards
 * compatibility with existing callers but are intentionally ignored — write
 * capability is governed by the permissions minted on the scoped token.
 *
 * The success shape ({ installationId, repositoryId, defaultBranch }) is
 * preserved so all existing callers (clone, commit, PR) keep working.
 */
export async function verifyRepoAccess(params: {
  userId?: string;
  owner: string;
  repo: string;
  requiredUserPermission?: RequiredRepoUserPermission;
}): Promise<RepoAccessResult> {
  const { owner, repo } = params;

  // 1. repo must be on the admin-curated allowlist
  const allowed = await getAllowedRepo(owner, repo);
  if (!allowed) {
    return { ok: false, reason: "not_allowlisted" };
  }

  // 2. the org-wide installation must exist
  const installation = await getOrgInstallation();
  if (!installation) {
    return { ok: false, reason: "no_org_installation" };
  }

  // 3. the installation must still cover this specific repo
  try {
    await withScopedInstallationOctokit({
      installationId: installation.installationId,
      repositoryId: allowed.repositoryId,
      permissions: { contents: "read" },
      operation: async (installationOctokit) => {
        await installationOctokit.rest.repos.get({ owner, repo });
      },
    });
  } catch (error: unknown) {
    const status = getGitHubHttpStatus(error);
    const message = error instanceof Error ? error.message : "";
    if (
      status === 404 ||
      status === 403 ||
      status === 422 ||
      message.includes(": 422 ")
    ) {
      return { ok: false, reason: "app_no_access" };
    }
    throw error;
  }

  return {
    ok: true,
    installationId: installation.installationId,
    repositoryId: allowed.repositoryId,
    defaultBranch: allowed.defaultBranch ?? "main",
  };
}

/**
 * Map access denial reasons to user-facing error messages.
 */
export function getRepoAccessErrorMessage(
  reason: RepoAccessDeniedReason,
): string {
  switch (reason) {
    case "not_allowlisted":
      return "This repository is not enabled for SLTWTR sessions. Ask an admin to add it in Settings → Admin.";
    case "no_org_installation":
      return "The SLTWTR GitHub App is not configured yet. Ask an admin to connect it in Settings → Admin.";
    case "app_no_access":
      return "The SLTWTR GitHub App can't access this repository. Ask an admin to update the app's repository permissions.";
  }
}
