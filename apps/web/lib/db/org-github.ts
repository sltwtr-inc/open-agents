import { and, asc, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import {
  type NewOrgAllowedRepo,
  type OrgAllowedRepo,
  type OrgGithubInstallation,
  orgAllowedRepos,
  orgGithubInstallation,
} from "./schema";

// ---------------------------------------------------------------------------
// Org-wide GitHub App installation (singleton)
// ---------------------------------------------------------------------------

export interface UpsertOrgInstallationInput {
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  repositorySelection: "all" | "selected";
  installationUrl?: string | null;
  configuredByUserId?: string | null;
}

/** Returns the configured org-wide installation, if any. */
export async function getOrgInstallation(): Promise<
  OrgGithubInstallation | undefined
> {
  const [row] = await db
    .select()
    .from(orgGithubInstallation)
    .orderBy(asc(orgGithubInstallation.createdAt))
    .limit(1);
  return row;
}

/**
 * Set the org-wide installation. Enforces a single row: any installation rows
 * with a different installationId are removed so `getOrgInstallation` is
 * unambiguous.
 */
export async function upsertOrgInstallation(
  input: UpsertOrgInstallationInput,
): Promise<OrgGithubInstallation> {
  const now = new Date();

  // Drop any stale singleton rows pointing at a different installation.
  await db
    .delete(orgGithubInstallation)
    .where(ne(orgGithubInstallation.installationId, input.installationId));

  const existing = await db
    .select({ id: orgGithubInstallation.id })
    .from(orgGithubInstallation)
    .where(eq(orgGithubInstallation.installationId, input.installationId))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(orgGithubInstallation)
      .set({
        accountLogin: input.accountLogin,
        accountType: input.accountType,
        repositorySelection: input.repositorySelection,
        installationUrl: input.installationUrl ?? null,
        ...(input.configuredByUserId !== undefined
          ? { configuredByUserId: input.configuredByUserId }
          : {}),
        updatedAt: now,
      })
      .where(eq(orgGithubInstallation.id, existing[0].id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update org GitHub installation");
    }
    return updated;
  }

  const [created] = await db
    .insert(orgGithubInstallation)
    .values({
      id: nanoid(),
      installationId: input.installationId,
      accountLogin: input.accountLogin,
      accountType: input.accountType,
      repositorySelection: input.repositorySelection,
      installationUrl: input.installationUrl ?? null,
      configuredByUserId: input.configuredByUserId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create org GitHub installation");
  }
  return created;
}

export async function deleteOrgInstallation(
  installationId: number,
): Promise<number> {
  const deleted = await db
    .delete(orgGithubInstallation)
    .where(eq(orgGithubInstallation.installationId, installationId))
    .returning({ id: orgGithubInstallation.id });
  return deleted.length;
}

// ---------------------------------------------------------------------------
// Admin-curated allowed repositories
// ---------------------------------------------------------------------------

export async function listAllowedRepos(): Promise<OrgAllowedRepo[]> {
  return db
    .select()
    .from(orgAllowedRepos)
    .orderBy(asc(orgAllowedRepos.owner), asc(orgAllowedRepos.repo));
}

export async function getAllowedRepo(
  owner: string,
  repo: string,
): Promise<OrgAllowedRepo | undefined> {
  const [row] = await db
    .select()
    .from(orgAllowedRepos)
    .where(
      and(
        sql`lower(${orgAllowedRepos.owner}) = ${owner.toLowerCase()}`,
        sql`lower(${orgAllowedRepos.repo}) = ${repo.toLowerCase()}`,
      ),
    )
    .limit(1);
  return row;
}

export async function getAllowedRepoById(
  id: string,
): Promise<OrgAllowedRepo | undefined> {
  const [row] = await db
    .select()
    .from(orgAllowedRepos)
    .where(eq(orgAllowedRepos.id, id))
    .limit(1);
  return row;
}

export type AddAllowedRepoInput = Omit<
  NewOrgAllowedRepo,
  "id" | "createdAt" | "updatedAt"
>;

export async function addAllowedRepo(
  input: AddAllowedRepoInput,
): Promise<OrgAllowedRepo> {
  const now = new Date();
  const existing = await getAllowedRepo(input.owner, input.repo);
  if (existing) {
    const [updated] = await db
      .update(orgAllowedRepos)
      .set({
        repositoryId: input.repositoryId,
        defaultBranch: input.defaultBranch ?? existing.defaultBranch,
        cloneUrl: input.cloneUrl,
        updatedAt: now,
      })
      .where(eq(orgAllowedRepos.id, existing.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to update allowed repo");
    }
    return updated;
  }

  const [created] = await db
    .insert(orgAllowedRepos)
    .values({ id: nanoid(), createdAt: now, updatedAt: now, ...input })
    .returning();
  if (!created) {
    throw new Error("Failed to add allowed repo");
  }
  return created;
}

export async function removeAllowedRepo(id: string): Promise<number> {
  const deleted = await db
    .delete(orgAllowedRepos)
    .where(eq(orgAllowedRepos.id, id))
    .returning({ id: orgAllowedRepos.id });
  return deleted.length;
}
