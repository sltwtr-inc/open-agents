import { requireAdminApi } from "@/lib/auth/require-admin";
import { getOrgInstallation } from "@/lib/db/org-github";

/** Current org-wide GitHub App installation status (admin-only). */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const installation = await getOrgInstallation();
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? null;

  return Response.json({
    appSlug,
    installation: installation
      ? {
          installationId: installation.installationId,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          repositorySelection: installation.repositorySelection,
          installationUrl: installation.installationUrl,
        }
      : null,
  });
}
