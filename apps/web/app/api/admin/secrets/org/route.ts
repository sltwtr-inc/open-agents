import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  appendSecretAudit,
  listOrgSecrets,
  upsertOrgSecret,
} from "@/lib/db/secrets";
import { isSecretsEncryptionConfigured } from "@/lib/secrets/crypto";
import { isValidEnvKey } from "@/lib/secrets/key";

const upsertSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
});

/** List org secret key names + descriptions (values never returned). */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const secrets = await listOrgSecrets();
  return Response.json(secrets);
}

/** Create or update an org secret. */
export async function POST(req: Request) {
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

  const { created } = await upsertOrgSecret({
    key: parsed.data.key,
    value: parsed.data.value,
    description: parsed.data.description ?? null,
    createdByUserId: auth.userId,
  });

  await appendSecretAudit({
    actorUserId: auth.userId,
    action: created ? "create" : "update",
    scope: "org",
    secretKey: parsed.data.key,
    allowedRepoId: null,
    sessionId: null,
  });

  return Response.json({ success: true, created });
}
