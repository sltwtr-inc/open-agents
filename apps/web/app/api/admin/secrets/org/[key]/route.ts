import { requireAdminApi } from "@/lib/auth/require-admin";
import { appendSecretAudit, deleteOrgSecret } from "@/lib/db/secrets";

/** Delete an org secret by key. */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ key: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { key } = await context.params;
  const deleted = await deleteOrgSecret(decodeURIComponent(key));
  if (deleted === 0) {
    return Response.json({ error: "Secret not found" }, { status: 404 });
  }

  await appendSecretAudit({
    actorUserId: auth.userId,
    action: "delete",
    scope: "org",
    secretKey: decodeURIComponent(key),
    allowedRepoId: null,
    sessionId: null,
  });

  return Response.json({ success: true });
}
