import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { NextRequest } from "next/server";

let authSession: {
  authProvider: "vercel";
  user: { id: string; email?: string };
} | null;
let isAdmin = false;

mock.module("server-only", () => ({}));

mock.module("arctic", () => ({
  generateState: () => "state-123",
}));

mock.module("@/lib/session/get-server-session", () => ({
  getServerSession: async () => authSession,
}));

mock.module("@/lib/db/users", () => ({
  isUserAdmin: async () => isAdmin,
}));

const routeModulePromise = import("./route");

const originalEnv = {
  NEXT_PUBLIC_GITHUB_APP_SLUG: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG,
  NODE_ENV: process.env.NODE_ENV,
};

function createRequest(url: string): NextRequest {
  const nextUrl = new URL(url);

  return {
    url,
    nextUrl,
    cookies: {
      get: () => undefined,
    },
  } as unknown as NextRequest;
}

describe("GET /api/github/app/install (admin org install)", () => {
  beforeEach(() => {
    authSession = {
      authProvider: "vercel",
      user: { id: "user-1", email: "matt@sltwtr.com" },
    };
    isAdmin = true;

    Object.assign(process.env, {
      NEXT_PUBLIC_GITHUB_APP_SLUG: "open-agents",
      NODE_ENV: "test",
    });
  });

  afterEach(() => {
    Object.assign(process.env, {
      NEXT_PUBLIC_GITHUB_APP_SLUG: originalEnv.NEXT_PUBLIC_GITHUB_APP_SLUG,
      NODE_ENV: originalEnv.NODE_ENV,
    });
  });

  test("redirects unauthenticated users home", async () => {
    authSession = null;
    const { GET } = await routeModulePromise;

    const response = await GET(
      createRequest("http://localhost/api/github/app/install"),
    );

    expect(response.status).toBe(307);
    const redirectUrl = new URL(response.headers.get("location") as string);
    expect(redirectUrl.pathname).toBe("/");
  });

  test("forbids non-admin users", async () => {
    isAdmin = false;
    const { GET } = await routeModulePromise;

    const response = await GET(
      createRequest(
        "http://localhost/api/github/app/install?next=/settings/admin",
      ),
    );

    expect(response.status).toBe(307);
    const redirectUrl = new URL(response.headers.get("location") as string);
    expect(redirectUrl.pathname).toBe("/settings/admin");
    expect(redirectUrl.searchParams.get("github")).toBe("forbidden");
  });

  test("redirects admins to the GitHub App install page", async () => {
    const { GET } = await routeModulePromise;

    const response = await GET(
      createRequest(
        "http://localhost/api/github/app/install?next=/settings/admin",
      ),
    );

    expect(response.status).toBe(307);
    const redirectUrl = new URL(response.headers.get("location") as string);
    expect(redirectUrl.origin).toBe("https://github.com");
    expect(redirectUrl.pathname).toContain("open-agents");
    expect(redirectUrl.searchParams.get("state")).toBe("state-123");
  });
});
