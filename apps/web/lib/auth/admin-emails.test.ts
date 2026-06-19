import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { isSeededAdminEmail } from "./admin-emails";

describe("isSeededAdminEmail", () => {
  const original = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "matt@sltwtr.com, owner@sltwtr.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  test("matches a configured admin email (case-insensitive)", () => {
    expect(isSeededAdminEmail("matt@sltwtr.com")).toBe(true);
    expect(isSeededAdminEmail(" OWNER@sltwtr.com ")).toBe(true);
  });

  test("rejects non-admin emails", () => {
    expect(isSeededAdminEmail("dev@sltwtr.com")).toBe(false);
  });

  test("returns false when ADMIN_EMAILS is unset", () => {
    process.env.ADMIN_EMAILS = undefined;
    expect(isSeededAdminEmail("matt@sltwtr.com")).toBe(false);
  });

  test("fails closed on missing email", () => {
    expect(isSeededAdminEmail(undefined)).toBe(false);
    expect(isSeededAdminEmail(null)).toBe(false);
    expect(isSeededAdminEmail("")).toBe(false);
  });
});
