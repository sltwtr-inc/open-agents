import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  addAllowedRepo,
  getOrgInstallation,
  listAllowedRepos,
} from "@/lib/db/org-github";
import { getRepoViaAppInstallation } from "@/lib/github/repos";

const addRepoSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

/** List admin-curated allowed repos. */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const repos = await listAllowedRepos();
  return Response.json(
    repos.map((row) => ({
      id: row.id,
      owner: row.owner,
      repo: row.repo,
      full_name: `${row.owner}/${row.repo}`,
      defaultBranch: row.defaultBranch,
      secretsEnabled: row.secretsEnabled,
    })),
  );
}

/** Add a repo to the allowlist (validated against the org installation). */
export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addRepoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "owner and repo are required" },
      { status: 400 },
    );
  }

  const installation = await getOrgInstallation();
  if (!installation) {
    return Response.json(
      { error: "Connect the org GitHub App before adding repositories." },
      { status: 400 },
    );
  }

  const lookup = await getRepoViaAppInstallation({
    installationId: installation.installationId,
    owner: parsed.data.owner,
    repo: parsed.data.repo,
  });
  if (!lookup) {
    return Response.json(
      {
        error:
          "The org GitHub App can't access that repository. Grant it access on GitHub first.",
      },
      { status: 400 },
    );
  }

  const created = await addAllowedRepo({
    owner: lookup.owner,
    repo: lookup.name,
    repositoryId: lookup.repositoryId,
    defaultBranch: lookup.defaultBranch,
    cloneUrl: lookup.cloneUrl,
    addedByUserId: auth.userId,
  });

  return Response.json({
    id: created.id,
    owner: created.owner,
    repo: created.repo,
    full_name: `${created.owner}/${created.repo}`,
    defaultBranch: created.defaultBranch,
  });
}
