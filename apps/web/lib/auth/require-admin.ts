import { isUserAdmin } from "@/lib/db/users";
import { getServerSession } from "@/lib/session/get-server-session";

export type RequireAdminResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

/**
 * Route-handler guard for admin-only API routes. Mirrors the server-action
 * `requireAdmin()` in `lib/admin/actions.ts`, but returns a `Response` instead
 * of throwing so handlers can short-circuit cleanly.
 */
export async function requireAdminApi(): Promise<RequireAdminResult> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: Response.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const admin = await isUserAdmin(session.user.id);
  if (!admin) {
    return {
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: session.user.id };
}
