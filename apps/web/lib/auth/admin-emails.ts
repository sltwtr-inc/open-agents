/**
 * Admin designation is declarative via the `ADMIN_EMAILS` env var
 * (comma-separated). Users whose primary (Vercel) email matches are created or
 * promoted with `users.isAdmin = true` on sign-in, so no manual DB editing is
 * required to grant the first admin. See `apps/web/lib/auth/config.ts`.
 */

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

/** Returns true when the email is in the configured admin allowlist. */
export function isSeededAdminEmail(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return getAdminEmails().has(normalizedEmail);
}
