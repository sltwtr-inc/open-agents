import { listAllowedRepos } from "@/lib/db/org-github";
import { getServerSession } from "@/lib/session/get-server-session";

/**
 * Repositories any authenticated team member may launch a session on, under the
 * single-org admin-managed model. This is the admin-curated allowlist — no
 * GitHub API call and no per-user token. Replaces the per-user
 * `/api/github/installations/repos` for the member picker.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowed = await listAllowedRepos();

  return Response.json(
    allowed.map((row) => ({
      owner: row.owner,
      name: row.repo,
      full_name: `${row.owner}/${row.repo}`,
      defaultBranch: row.defaultBranch,
    })),
  );
}
