import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/db/users";
import { upsertOrgInstallation } from "@/lib/db/org-github";
import { getInstallationDetails } from "@/lib/github/app";
import { sanitizeInternalRedirect } from "@/lib/redirect-safety";
import { getServerSession } from "@/lib/session/get-server-session";

function parseInstallationId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const installationId = Number.parseInt(value, 10);
  if (!Number.isFinite(installationId)) {
    return null;
  }

  return installationId;
}

function redirectAndClearCookies(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.delete("github_app_install_redirect_to");
  response.cookies.delete("github_app_install_state");
  response.cookies.delete("github_reconnect");
  return response;
}

/**
 * GitHub App Setup URL callback. Under the single-org model this records the
 * org-wide installation (admin-only). OAuth token exchange is still handled by
 * better-auth at /api/auth/callback/github.
 */
export async function GET(req: Request): Promise<Response> {
  const cookieStore = await cookies();
  const redirectTo = sanitizeInternalRedirect(
    cookieStore.get("github_app_install_redirect_to")?.value,
    "/settings/admin",
    req.url,
  );

  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const redirectUrl = new URL(redirectTo, req.url);

  // Only admins configure the org-wide installation.
  const admin = await isUserAdmin(session.user.id);
  if (!admin) {
    redirectUrl.searchParams.set("github", "forbidden");
    return redirectAndClearCookies(redirectUrl);
  }

  const requestUrl = new URL(req.url);
  const installationId = parseInstallationId(
    requestUrl.searchParams.get("installation_id"),
  );
  const setupAction = requestUrl.searchParams.get("setup_action");

  if (setupAction === "request") {
    redirectUrl.searchParams.set("github", "request_sent");
    return redirectAndClearCookies(redirectUrl);
  }

  if (!installationId) {
    redirectUrl.searchParams.set("github", "no_action");
    redirectUrl.searchParams.set("missing_installation_id", "1");
    return redirectAndClearCookies(redirectUrl);
  }

  try {
    const details = await getInstallationDetails(installationId);
    if (!details) {
      redirectUrl.searchParams.set("github", "pending_sync");
      return redirectAndClearCookies(redirectUrl);
    }

    await upsertOrgInstallation({
      installationId: details.installationId,
      accountLogin: details.accountLogin,
      accountType: details.accountType,
      repositorySelection: details.repositorySelection,
      installationUrl: details.installationUrl,
      configuredByUserId: session.user.id,
    });

    redirectUrl.searchParams.set("github", "app_installed");
  } catch (error) {
    console.error("Failed to record org GitHub installation:", error);
    redirectUrl.searchParams.set("github", "pending_sync");
  }

  return redirectAndClearCookies(redirectUrl);
}
