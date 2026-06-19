"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/swr";

const allowedRepoSchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  full_name: z.string(),
  defaultBranch: z.string().nullable(),
});

const allowedReposSchema = z.array(allowedRepoSchema);

type AllowedRepo = z.infer<typeof allowedRepoSchema>;

async function fetchAllowedRepos(url: string): Promise<AllowedRepo[]> {
  const json = await fetcher<unknown>(url);
  const parsed = allowedReposSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid response");
  }
  return parsed.data;
}

function parseOwnerRepo(value: string): { owner: string; repo: string } | null {
  const trimmed = value.trim().replace(/^https?:\/\/github\.com\//i, "");
  const [owner, repo] = trimmed.split("/");
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo: repo.replace(/\.git$/, "") };
}

export function AllowedReposSection() {
  const { data, isLoading, mutate } = useSWR<AllowedRepo[]>(
    "/api/admin/repos",
    fetchAllowedRepos,
  );
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const repos = data ?? [];

  async function handleAdd() {
    setError(null);
    const parsed = parseOwnerRepo(value);
    if (!parsed) {
      setError("Enter a repository as owner/repo.");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/admin/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Failed to add repository.");
        return;
      }
      setValue("");
      await mutate();
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await fetch(`/api/admin/repos/${id}`, { method: "DELETE" });
      await mutate();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Allowed Repositories</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Repositories the team can start sessions on. The repo must be
          accessible to the org GitHub App.
        </p>
      </div>

      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="owner/repo"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAdd();
              }
            }}
          />
          <Button onClick={handleAdd} disabled={isAdding} className="shrink-0">
            {isAdding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="divide-y divide-border border-t border-border">
        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : repos.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            No repositories added yet.
          </p>
        ) : (
          repos.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <span className="truncate text-sm">{repo.full_name}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={removingId === repo.id}
                onClick={() => handleRemove(repo.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                {removingId === repo.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
