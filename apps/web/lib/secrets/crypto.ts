import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for org/repo sandbox secrets, keyed by
 * SECRETS_ENCRYPTION_KEY (a 32-byte key, base64 or hex). Independent of Better
 * Auth's internal OAuth-token crypto so secret storage owns its own key.
 *
 * Ciphertext format: `iv:authTag:ciphertext`, each part base64-encoded.
 */

const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const ALGORITHM = "aes-256-gcm";

function loadKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY is not configured; cannot manage sandbox secrets.",
    );
  }

  const trimmed = raw.trim();
  // Try base64 first, then hex.
  let key = Buffer.from(trimmed, "base64");
  if (key.length !== KEY_LENGTH) {
    key = Buffer.from(trimmed, "hex");
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY must decode to 32 bytes (base64 or hex).",
    );
  }

  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const key = loadKey();
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed secret ciphertext");
  }

  const [ivPart, authTagPart, ciphertextPart] = parts;
  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(authTagPart, "base64");
  const ciphertext = Buffer.from(ciphertextPart, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** True when a secrets-encryption key is configured. */
export function isSecretsEncryptionConfigured(): boolean {
  return Boolean(process.env.SECRETS_ENCRYPTION_KEY);
}
