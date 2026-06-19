/** Minimum secret length to redact — avoids blanking out trivial values. */
const MIN_REDACTABLE_LENGTH = 4;
const REDACTION_PLACEHOLDER = "***";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace any occurrence of the given secret values in `text` with `***`.
 *
 * Best-effort defense against secrets injected into the sandbox env leaking
 * into the model transcript (e.g. `echo $TOKEN`). It does not catch values the
 * agent transforms (base64, splitting), so it pairs with per-repo opt-in and
 * narrow token scopes rather than standing alone.
 */
export function redactSecrets(text: string, values: string[]): string {
  if (!text) {
    return text;
  }

  let redacted = text;
  for (const value of values) {
    if (!value || value.length < MIN_REDACTABLE_LENGTH) {
      continue;
    }
    redacted = redacted.replaceAll(value, REDACTION_PLACEHOLDER);
    // Defensive: also catch case-insensitive matches for hex-ish tokens.
    redacted = redacted.replace(
      new RegExp(escapeRegExp(value), "gi"),
      REDACTION_PLACEHOLDER,
    );
  }
  return redacted;
}
