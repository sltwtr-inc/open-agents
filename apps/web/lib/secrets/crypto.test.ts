import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { decryptSecret, encryptSecret } from "./crypto";

// 32-byte key, base64-encoded.
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

describe("secret crypto", () => {
  const original = process.env.SECRETS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = original;
  });

  test("round-trips a value", () => {
    const plaintext = "shpat_super-secret-token-123";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  test("produces a unique ciphertext per call (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  test("throws when the key is missing", () => {
    process.env.SECRETS_ENCRYPTION_KEY = undefined;
    expect(() => encryptSecret("x")).toThrow();
  });

  test("rejects malformed ciphertext", () => {
    expect(() => decryptSecret("not-valid")).toThrow();
  });
});
