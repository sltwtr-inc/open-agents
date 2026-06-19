import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { decryptSecret, encryptSecret } from "@/lib/secrets/crypto";
import { db } from "./client";
import {
  type NewSecretAuditEntry,
  orgSecrets,
  repoSecrets,
  secretAuditLog,
} from "./schema";

/** Secret metadata safe to return to admins — never includes the value. */
export interface SecretSummary {
  id: string;
  key: string;
  description: string | null;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Org-level secrets
// ---------------------------------------------------------------------------

export async function listOrgSecrets(): Promise<SecretSummary[]> {
  const rows = await db
    .select({
      id: orgSecrets.id,
      key: orgSecrets.key,
      description: orgSecrets.description,
      updatedAt: orgSecrets.updatedAt,
    })
    .from(orgSecrets)
    .orderBy(orgSecrets.key);
  return rows;
}

export async function upsertOrgSecret(input: {
  key: string;
  value: string;
  description?: string | null;
  createdByUserId?: string | null;
}): Promise<{ created: boolean }> {
  const now = new Date();
  const valueCiphertext = encryptSecret(input.value);

  const [existing] = await db
    .select({ id: orgSecrets.id })
    .from(orgSecrets)
    .where(eq(orgSecrets.key, input.key))
    .limit(1);

  if (existing) {
    await db
      .update(orgSecrets)
      .set({
        valueCiphertext,
        description: input.description ?? null,
        updatedAt: now,
      })
      .where(eq(orgSecrets.id, existing.id));
    return { created: false };
  }

  await db.insert(orgSecrets).values({
    id: nanoid(),
    key: input.key,
    valueCiphertext,
    description: input.description ?? null,
    createdByUserId: input.createdByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { created: true };
}

export async function deleteOrgSecret(key: string): Promise<number> {
  const deleted = await db
    .delete(orgSecrets)
    .where(eq(orgSecrets.key, key))
    .returning({ id: orgSecrets.id });
  return deleted.length;
}

// ---------------------------------------------------------------------------
// Repo-level secrets
// ---------------------------------------------------------------------------

export async function listRepoSecrets(
  allowedRepoId: string,
): Promise<SecretSummary[]> {
  const rows = await db
    .select({
      id: repoSecrets.id,
      key: repoSecrets.key,
      description: repoSecrets.description,
      updatedAt: repoSecrets.updatedAt,
    })
    .from(repoSecrets)
    .where(eq(repoSecrets.allowedRepoId, allowedRepoId))
    .orderBy(repoSecrets.key);
  return rows;
}

export async function upsertRepoSecret(input: {
  allowedRepoId: string;
  key: string;
  value: string;
  description?: string | null;
  createdByUserId?: string | null;
}): Promise<{ created: boolean }> {
  const now = new Date();
  const valueCiphertext = encryptSecret(input.value);

  const [existing] = await db
    .select({ id: repoSecrets.id })
    .from(repoSecrets)
    .where(
      and(
        eq(repoSecrets.allowedRepoId, input.allowedRepoId),
        eq(repoSecrets.key, input.key),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(repoSecrets)
      .set({
        valueCiphertext,
        description: input.description ?? null,
        updatedAt: now,
      })
      .where(eq(repoSecrets.id, existing.id));
    return { created: false };
  }

  await db.insert(repoSecrets).values({
    id: nanoid(),
    allowedRepoId: input.allowedRepoId,
    key: input.key,
    valueCiphertext,
    description: input.description ?? null,
    createdByUserId: input.createdByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { created: true };
}

export async function deleteRepoSecret(
  allowedRepoId: string,
  key: string,
): Promise<number> {
  const deleted = await db
    .delete(repoSecrets)
    .where(
      and(
        eq(repoSecrets.allowedRepoId, allowedRepoId),
        eq(repoSecrets.key, key),
      ),
    )
    .returning({ id: repoSecrets.id });
  return deleted.length;
}

/**
 * Resolve the plaintext env map for a repo session: org defaults overlaid with
 * repo-specific overrides. Decryption happens here, server-side only.
 */
export async function getResolvedSecretsForRepo(
  allowedRepoId: string,
): Promise<Record<string, string>> {
  const [orgRows, repoRows] = await Promise.all([
    db
      .select({ key: orgSecrets.key, value: orgSecrets.valueCiphertext })
      .from(orgSecrets),
    db
      .select({ key: repoSecrets.key, value: repoSecrets.valueCiphertext })
      .from(repoSecrets)
      .where(eq(repoSecrets.allowedRepoId, allowedRepoId)),
  ]);

  const resolved: Record<string, string> = {};
  for (const row of orgRows) {
    resolved[row.key] = decryptSecret(row.value);
  }
  for (const row of repoRows) {
    resolved[row.key] = decryptSecret(row.value);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function appendSecretAudit(
  entry: Omit<NewSecretAuditEntry, "id" | "createdAt">,
): Promise<void> {
  await db.insert(secretAuditLog).values({
    id: nanoid(),
    createdAt: new Date(),
    ...entry,
  });
}

export async function listSecretAudit(limit = 50): Promise<
  Array<{
    id: string;
    action: string;
    scope: string;
    secretKey: string;
    allowedRepoId: string | null;
    sessionId: string | null;
    actorUserId: string | null;
    createdAt: Date;
  }>
> {
  return db
    .select()
    .from(secretAuditLog)
    .orderBy(desc(secretAuditLog.createdAt))
    .limit(limit);
}
