import { beforeEach, describe, expect, mock, test } from "bun:test";

let authSession: { user: { id: string } } | null;
let cookieValues: Record<string, string>;
let isAdmin = true;
let installationDetails: {
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  repositorySelection: "all" | "selected";
  installationUrl: string | null;
} | null;
let upsertedInstallationId: number | null = null;

mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieValues[name];
      return value ? { value } : undefined;
    },
  }),
}));

mock.module("@/lib/session/get-server-session", () => ({
  getServerSession: async () => authSession,
}));

mock.module("@/lib/db/users", () => ({
  isUserAdmin: async () => isAdmin,
}));

mock.module("@/lib/github/app", () => ({
  getInstallationDetails: async () => installationDetails,
}));

mock.module("@/lib/db/org-github", () => ({
  upsertOrgInstallation: async (input: { installationId: number }) => {
    upsertedInstallationId = input.installationId;
    return input;
  },
}));

const routeModulePromise = import("./route");

function getRedirectUrl(response: Response): URL {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  return new URL(location as string);
}

describe("GET /api/github/app/callback (admin org install)", () => {
  beforeEach(() => {
    authSession = { user: { id: "user-1" } };
    cookieValues = {
      github_app_install_redirect_to: "/settings/admin",
    };
    isAdmin = true;
    installationDetails = {
      installationId: 123,
      accountLogin: "sltwtr",
      accountType: "Organization",
      repositorySelection: "selected",
      installationUrl: "https://github.com/orgs/sltwtr",
    };
    upsertedInstallationId = null;
  });

  test("forbids non-admins", async () => {
    isAdmin = false;
    const { GET } = await routeModulePromise;

    const response = await GET(
      new Request(
        "http://localhost/api/github/app/callback?installation_id=123",
      ),
    );

    const redirectUrl = getRedirectUrl(response);
    expect(redirectUrl.searchParams.get("github")).toBe("forbidden");
    expect(upsertedInstallationId).toBeNull();
  });

  test("returns no_action when no installation_id is present", async () => {
    const { GET } = await routeModulePromise;

    const response = await GET(
      new Request("http://localhost/api/github/app/callback"),
    );

    const redirectUrl = getRedirectUrl(response);
    expect(redirectUrl.pathname).toBe("/settings/admin");
    expect(redirectUrl.searchParams.get("github")).toBe("no_action");
    expect(redirectUrl.searchParams.get("missing_installation_id")).toBe("1");
  });

  test("returns pending_sync when installation details can't be fetched", async () => {
    installationDetails = null;
    const { GET } = await routeModulePromise;

    const response = await GET(
      new Request(
        "http://localhost/api/github/app/callback?installation_id=123",
      ),
    );

    const redirectUrl = getRedirectUrl(response);
    expect(redirectUrl.searchParams.get("github")).toBe("pending_sync");
    expect(upsertedInstallationId).toBeNull();
  });

  test("records the org installation and returns app_installed", async () => {
    const { GET } = await routeModulePromise;

    const response = await GET(
      new Request(
        "http://localhost/api/github/app/callback?installation_id=123",
      ),
    );

    const redirectUrl = getRedirectUrl(response);
    expect(redirectUrl.searchParams.get("github")).toBe("app_installed");
    expect(upsertedInstallationId).toBe(123);
  });
});
