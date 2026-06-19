import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { getAllowedRepoById } from "@/lib/db/org-github";
import {
  appendSecretAudit,
  deleteRepoSecret,
  listRepoSecrets,
  upsertRepoSecret,
} from "@/lib/db/secrets";
import { isSecretsEncryptionConfigured } from "@/lib/secrets/crypto";
import { isValidEnvKey } from "@/lib/secrets/key";

const upsertSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
});

async function requireRepo(allowedRepoId: string) {
  const repo = await getAllowedRepoById(allowedRepoId);
  return repo ?? null;
}

/** List repo-level secret summaries. */
export async function GET(
  _req: Request,
  context: { params: Promise<{ allowedRepoId: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { allowedRepoId } = await context.params;
  if (!(await requireRepo(allowedRepoId))) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  const secrets = await listRepoSecrets(allowedRepoId);
  return Response.json(secrets);
}

/** Create or update a repo-level secret. */
export async function POST(
  req: Request,
  context: { params: Promise<{ allowedRepoId: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  if (!isSecretsEncryptionConfigured()) {
    return Response.json(
      { error: "SECRETS_ENCRYPTION_KEY is not configured." },
      { status: 500 },
    );
  }

  const { allowedRepoId } = await context.params;
  if (!(await requireRepo(allowedRepoId))) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "key and value are required" },
      { status: 400 },
    );
  }
  if (!isValidEnvKey(parsed.data.key)) {
    return Response.json(
      { error: "Invalid key. Use letters, digits, and underscores." },
      { status: 400 },
    );
  }

  const { created } = await upsertRepoSecret({
    allowedRepoId,
    key: parsed.data.key,
    value: parsed.data.value,
    description: parsed.data.description ?? null,
    createdByUserId: auth.userId,
  });

  await appendSecretAudit({
    actorUserId: auth.userId,
    action: created ? "create" : "update",
    scope: "repo",
    secretKey: parsed.data.key,
    allowedRepoId,
    sessionId: null,
  });

  return Response.json({ success: true, created });
}

/** Delete a repo-level secret by key (?key=NAME). */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ allowedRepoId: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { allowedRepoId } = await context.params;
  const key = new URL(req.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  const deleted = await deleteRepoSecret(allowedRepoId, key);
  if (deleted === 0) {
    return Response.json({ error: "Secret not found" }, { status: 404 });
  }

  await appendSecretAudit({
    actorUserId: auth.userId,
    action: "delete",
    scope: "repo",
    secretKey: key,
    allowedRepoId,
    sessionId: null,
  });

  return Response.json({ success: true });
}
