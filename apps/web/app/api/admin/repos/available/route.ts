import { requireAdminApi } from "@/lib/auth/require-admin";
import { getOrgInstallation } from "@/lib/db/org-github";
import { listInstallationRepositoriesWithAppToken } from "@/lib/github/repos";

/**
 * Repos the org installation can access, for an admin to pick from when
 * curating the allowlist. Uses an app-minted token (not a user token).
 */
export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const installation = await getOrgInstallation();
  if (!installation) {
    return Response.json(
      { error: "Connect the org GitHub App first." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() || undefined;
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const limit =
    typeof parsedLimit === "number" && Number.isFinite(parsedLimit)
      ? parsedLimit
      : undefined;

  try {
    const repos = await listInstallationRepositoriesWithAppToken({
      installationId: installation.installationId,
      query,
      limit,
    });
    return Response.json(repos);
  } catch (error) {
    console.error("Failed to list installation repositories:", error);
    return Response.json(
      { error: "Failed to fetch repositories" },
      { status: 500 },
    );
  }
}
