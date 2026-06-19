"use client";

import { useState } from "react";
import useSWR from "swr";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetcher } from "@/lib/swr";
import { SecretEditor } from "./secret-editor";

const allowedRepoSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  secretsEnabled: z.boolean(),
});

const allowedReposSchema = z.array(allowedRepoSchema);

type AllowedRepo = z.infer<typeof allowedRepoSchema>;

async function fetchRepos(url: string): Promise<AllowedRepo[]> {
  const json = await fetcher<unknown>(url);
  const parsed = allowedReposSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid response");
  }
  return parsed.data;
}

function RepoSecretsPanel({
  repos,
  onToggle,
}: {
  repos: AllowedRepo[];
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = repos.find((repo) => repo.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>
        <SelectContent>
          {repos.map((repo) => (
            <SelectItem key={repo.id} value={repo.id}>
              {repo.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <>
          <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
            <span className="text-sm">
              Inject secrets into sandboxes for{" "}
              <span className="font-medium">{selected.full_name}</span>
            </span>
            <Switch
              checked={selected.secretsEnabled}
              onCheckedChange={(checked) => onToggle(selected.id, checked)}
            />
          </label>

          {!selected.secretsEnabled && (
            <p className="text-xs text-amber-500">
              Secret injection is off for this repo. Org and repo secrets will
              not be available in its sandboxes until you enable it.
            </p>
          )}

          <p className="text-sm font-medium">Repo overrides</p>
          <SecretEditor
            listUrl={`/api/admin/secrets/repo/${selected.id}`}
            postUrl={`/api/admin/secrets/repo/${selected.id}`}
            buildDeleteUrl={(key) =>
              `/api/admin/secrets/repo/${selected.id}?key=${encodeURIComponent(key)}`
            }
          />
        </>
      )}
    </div>
  );
}

export function SecretsSection() {
  const { data, mutate } = useSWR<AllowedRepo[]>(
    "/api/admin/repos",
    fetchRepos,
  );
  const repos = data ?? [];

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/repos/${id}/secrets-toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await mutate();
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Sandbox Secrets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Environment variables injected into team sandboxes. Org secrets apply
          to every opted-in repo; repo overrides take precedence. Values are
          encrypted at rest and write-only — they are never displayed again.
          Injection requires per-repo opt-in below.
        </p>
      </div>

      <div className="space-y-6 px-5 py-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">Org secrets</p>
          <SecretEditor
            listUrl="/api/admin/secrets/org"
            postUrl="/api/admin/secrets/org"
            buildDeleteUrl={(key) =>
              `/api/admin/secrets/org/${encodeURIComponent(key)}`
            }
          />
        </div>

        <div className="space-y-3 border-t border-border pt-6">
          <p className="text-sm font-medium">Per-repo</p>
          {repos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add repositories above to configure per-repo secrets.
            </p>
          ) : (
            <RepoSecretsPanel repos={repos} onToggle={handleToggle} />
          )}
        </div>
      </div>
    </div>
  );
}
