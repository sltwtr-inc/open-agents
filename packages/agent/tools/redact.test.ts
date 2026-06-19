import { describe, expect, test } from "bun:test";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  test("replaces secret values with ***", () => {
    const out = redactSecrets("token is shpat_abcdef123456", [
      "shpat_abcdef123456",
    ]);
    expect(out).toBe("token is ***");
  });

  test("redacts every occurrence", () => {
    const out = redactSecrets("a=SEKRETVALUE b=SEKRETVALUE", ["SEKRETVALUE"]);
    expect(out).toBe("a=*** b=***");
  });

  test("is case-insensitive", () => {
    const out = redactSecrets("ABCDEF and abcdef", ["abcdef"]);
    expect(out).toBe("*** and ***");
  });

  test("skips trivially short values to avoid blanking output", () => {
    const out = redactSecrets("the cat sat", ["at"]);
    expect(out).toBe("the cat sat");
  });

  test("ignores empty values and empty text", () => {
    expect(redactSecrets("hello", [""])).toBe("hello");
    expect(redactSecrets("", ["secretvalue"])).toBe("");
  });

  test("handles regex-special characters in the secret", () => {
    const out = redactSecrets("key=a.b*c(d)", ["a.b*c(d)"]);
    expect(out).toBe("key=***");
  });
});
