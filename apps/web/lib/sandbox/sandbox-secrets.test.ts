import { beforeEach, describe, expect, mock, test } from "bun:test";

let allowedRepo: { id: string; secretsEnabled: boolean } | undefined;
let resolved: Record<string, string>;
let encryptionConfigured = true;
let auditCalls: Array<{ action: string; secretKey: string }> = [];

mock.module("@/lib/db/org-github", () => ({
  getAllowedRepo: async () => allowedRepo,
}));

mock.module("@/lib/db/secrets", () => ({
  getResolvedSecretsForRepo: async () => resolved,
  appendSecretAudit: async (entry: { action: string; secretKey: string }) => {
    auditCalls.push(entry);
  },
}));

mock.module("@/lib/secrets/crypto", () => ({
  isSecretsEncryptionConfigured: () => encryptionConfigured,
}));

const { resolveSandboxSecrets } = await import("./sandbox-secrets");

describe("resolveSandboxSecrets", () => {
  beforeEach(() => {
    allowedRepo = { id: "repo-1", secretsEnabled: true };
    resolved = { API_KEY: "secret-value" };
    encryptionConfigured = true;
    auditCalls = [];
  });

  test("returns undefined without owner/repo", async () => {
    expect(
      await resolveSandboxSecrets({ sessionId: "s1", owner: null, repo: null }),
    ).toBeUndefined();
  });

  test("returns undefined when encryption is not configured", async () => {
    encryptionConfigured = false;
    expect(
      await resolveSandboxSecrets({ sessionId: "s1", owner: "o", repo: "r" }),
    ).toBeUndefined();
  });

  test("returns undefined when the repo has not opted in", async () => {
    allowedRepo = { id: "repo-1", secretsEnabled: false };
    expect(
      await resolveSandboxSecrets({ sessionId: "s1", owner: "o", repo: "r" }),
    ).toBeUndefined();
  });

  test("returns undefined when the repo is not allowlisted", async () => {
    allowedRepo = undefined;
    expect(
      await resolveSandboxSecrets({ sessionId: "s1", owner: "o", repo: "r" }),
    ).toBeUndefined();
  });

  test("returns resolved secrets when opted in", async () => {
    const result = await resolveSandboxSecrets({
      sessionId: "s1",
      owner: "o",
      repo: "r",
    });
    expect(result).toEqual({ API_KEY: "secret-value" });
  });

  test("audits only when audit is requested, with key names only", async () => {
    await resolveSandboxSecrets({ sessionId: "s1", owner: "o", repo: "r" });
    expect(auditCalls).toHaveLength(0);

    await resolveSandboxSecrets({
      sessionId: "s1",
      owner: "o",
      repo: "r",
      audit: true,
    });
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]).toMatchObject({
      action: "inject",
      secretKey: "API_KEY",
    });
  });
});
