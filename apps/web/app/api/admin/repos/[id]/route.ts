import { requireAdminApi } from "@/lib/auth/require-admin";
import { removeAllowedRepo } from "@/lib/db/org-github";

/** Remove a repo from the allowlist. */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const deleted = await removeAllowedRepo(id);
  if (deleted === 0) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
