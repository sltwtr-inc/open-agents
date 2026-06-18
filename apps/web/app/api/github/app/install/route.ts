import { generateState } from "arctic";
import { NextResponse, type NextRequest } from "next/server";
import { isUserAdmin } from "@/lib/db/users";
import { sanitizeInternalRedirect } from "@/lib/redirect-safety";
import { getServerSession } from "@/lib/session/get-server-session";

const COOKIE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 60 * 15,
  sameSite: "lax" as const,
};

function redirectWithInstallCookies(
  url: string | URL,
  redirectTo: string,
  state: string,
): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.set(
    "github_app_install_redirect_to",
    redirectTo,
    COOKIE_OPTIONS,
  );
  response.cookies.set("github_app_install_state", state, COOKIE_OPTIONS);
  return response;
}

/**
 * Start the org-wide GitHub App installation flow. Admin-only: under the
 * single-org model one admin installs the app for the team's GitHub account,
 * and the setup callback records it as the org installation.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const session = await getServerSession();
  const redirectTo = sanitizeInternalRedirect(
    req.nextUrl.searchParams.get("next"),
    "/settings/admin",
    req.url,
  );

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const admin = await isUserAdmin(session.user.id);
  if (!admin) {
    const fallbackUrl = new URL(redirectTo, req.url);
    fallbackUrl.searchParams.set("github", "forbidden");
    return NextResponse.redirect(fallbackUrl);
  }

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  if (!appSlug) {
    const fallbackUrl = new URL(redirectTo, req.url);
    fallbackUrl.searchParams.set("github", "app_not_configured");
    return NextResponse.redirect(fallbackUrl);
  }

  const state = generateState();
  const installUrl = new URL(
    `https://github.com/apps/${appSlug}/installations/select_target`,
  );
  installUrl.searchParams.set("state", state);
  return redirectWithInstallCookies(installUrl, redirectTo, state);
}
