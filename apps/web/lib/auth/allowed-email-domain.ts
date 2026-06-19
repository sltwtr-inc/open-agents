/**
 * Sign-in is restricted to a single email domain (the SLTWTR team).
 *
 * The restriction is enforced against the primary (Vercel) identity email in
 * `apps/web/lib/auth/config.ts`. It is intentionally NOT applied to linked
 * GitHub accounts, whose email may differ (account linking allows different
 * emails). Mirrors the domain-allowlist shape in `managed-template-trial.ts`.
 */

const DEFAULT_ALLOWED_SIGNIN_EMAIL_DOMAIN = "sltwtr.com";

export const SIGNIN_EMAIL_DOMAIN_ERROR =
  "Access is restricted to SLTWTR team members.";

function getAllowedSignInEmailDomain(): string {
  return (
    process.env.ALLOWED_SIGNIN_EMAIL_DOMAIN?.trim().toLowerCase() ||
    DEFAULT_ALLOWED_SIGNIN_EMAIL_DOMAIN
  );
}

/**
 * Returns true only when the email belongs to the allowed sign-in domain.
 * Fails closed: a missing or malformed email is never allowed.
 */
export function isAllowedSignInEmail(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  const emailDomain = normalizedEmail.split("@")[1];
  return emailDomain === getAllowedSignInEmailDomain();
}
