import { beforeEach, describe, expect, mock, test } from "bun:test";

let allowedRepo:
  | { id: string; repositoryId: number; defaultBranch: string | null }
  | undefined;
let orgInstallation: { installationId: number } | undefined;
let scopedShouldThrow: { status?: number; message?: string } | null = null;

mock.module("@/lib/db/org-github", () => ({
  getAllowedRepo: async () => allowedRepo,
  getOrgInstallation: async () => orgInstallation,
}));

mock.module("./app", () => ({
  withScopedInstallationOctokit: async () => {
    if (scopedShouldThrow) {
      throw Object.assign(new Error(scopedShouldThrow.message ?? "err"), {
        status: scopedShouldThrow.status,
      });
    }
    return undefined;
  },
}));

const { verifyRepoAccess } = await import("./access");

describe("verifyRepoAccess (single-org model)", () => {
  beforeEach(() => {
    allowedRepo = { id: "r1", repositoryId: 555, defaultBranch: "main" };
    orgInstallation = { installationId: 42 };
    scopedShouldThrow = null;
  });

  test("denies repos not on the allowlist", async () => {
    allowedRepo = undefined;
    const result = await verifyRepoAccess({ owner: "sltwtr", repo: "x" });
    expect(result).toEqual({ ok: false, reason: "not_allowlisted" });
  });

  test("denies when the org installation is missing", async () => {
    orgInstallation = undefined;
    const result = await verifyRepoAccess({ owner: "sltwtr", repo: "x" });
    expect(result).toEqual({ ok: false, reason: "no_org_installation" });
  });

  test("allows an allowlisted repo covered by the org install", async () => {
    const result = await verifyRepoAccess({ owner: "sltwtr", repo: "x" });
    expect(result).toEqual({
      ok: true,
      installationId: 42,
      repositoryId: 555,
      defaultBranch: "main",
    });
  });

  test("denies when the installation can't reach the repo", async () => {
    scopedShouldThrow = { status: 404 };
    const result = await verifyRepoAccess({ owner: "sltwtr", repo: "x" });
    expect(result).toEqual({ ok: false, reason: "app_no_access" });
  });

  test("defaults the branch to main when unknown", async () => {
    allowedRepo = { id: "r1", repositoryId: 555, defaultBranch: null };
    const result = await verifyRepoAccess({ owner: "sltwtr", repo: "x" });
    expect(result).toMatchObject({ ok: true, defaultBranch: "main" });
  });
});
