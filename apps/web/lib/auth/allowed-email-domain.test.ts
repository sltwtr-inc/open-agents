import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { isAllowedSignInEmail } from "./allowed-email-domain";

describe("isAllowedSignInEmail", () => {
  const originalDomain = process.env.ALLOWED_SIGNIN_EMAIL_DOMAIN;

  beforeEach(() => {
    process.env.ALLOWED_SIGNIN_EMAIL_DOMAIN = undefined;
  });

  afterEach(() => {
    process.env.ALLOWED_SIGNIN_EMAIL_DOMAIN = originalDomain;
  });

  test("allows the default sltwtr.com domain", () => {
    expect(isAllowedSignInEmail("matt@sltwtr.com")).toBe(true);
  });

  test("is case- and whitespace-insensitive", () => {
    expect(isAllowedSignInEmail("  Matt@SLTWTR.com  ")).toBe(true);
  });

  test("rejects other domains", () => {
    expect(isAllowedSignInEmail("someone@gmail.com")).toBe(false);
    expect(isAllowedSignInEmail("someone@notsltwtr.com")).toBe(false);
  });

  test("fails closed on missing or malformed email", () => {
    expect(isAllowedSignInEmail(undefined)).toBe(false);
    expect(isAllowedSignInEmail(null)).toBe(false);
    expect(isAllowedSignInEmail("")).toBe(false);
    expect(isAllowedSignInEmail("no-at-sign")).toBe(false);
  });

  test("honors an overridden domain", () => {
    process.env.ALLOWED_SIGNIN_EMAIL_DOMAIN = "example.com";
    expect(isAllowedSignInEmail("user@example.com")).toBe(true);
    expect(isAllowedSignInEmail("matt@sltwtr.com")).toBe(false);
  });
});
