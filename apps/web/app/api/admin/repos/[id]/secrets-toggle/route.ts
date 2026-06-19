import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { setRepoSecretsEnabled } from "@/lib/db/org-github";

const toggleSchema = z.object({ enabled: z.boolean() });

/** Enable/disable secret injection for an allowlisted repo (per-repo opt-in). */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "enabled is required" }, { status: 400 });
  }

  const { id } = await context.params;
  const updated = await setRepoSecretsEnabled(id, parsed.data.enabled);
  if (updated === 0) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  return Response.json({ success: true, enabled: parsed.data.enabled });
}
