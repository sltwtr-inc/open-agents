"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/swr";

const secretSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  description: z.string().nullable(),
});

const secretSummariesSchema = z.array(secretSummarySchema);

type SecretSummary = z.infer<typeof secretSummarySchema>;

async function fetchSecrets(url: string): Promise<SecretSummary[]> {
  const json = await fetcher<unknown>(url);
  const parsed = secretSummariesSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid response");
  }
  return parsed.data;
}

/**
 * Write-only secret manager: lists key names + descriptions (never values) and
 * supports create/update (set) and delete.
 */
export function SecretEditor({
  listUrl,
  postUrl,
  buildDeleteUrl,
}: {
  listUrl: string;
  postUrl: string;
  buildDeleteUrl: (key: string) => string;
}) {
  const { data, isLoading, mutate } = useSWR<SecretSummary[]>(
    listUrl,
    fetchSecrets,
  );
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const secrets = data ?? [];

  async function handleSave() {
    setError(null);
    if (!(key.trim() && value)) {
      setError("Key and value are required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          value,
          description: description.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Failed to save secret.");
        return;
      }
      setKey("");
      setValue("");
      setDescription("");
      await mutate();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(secretKey: string) {
    setRemovingKey(secretKey);
    try {
      await fetch(buildDeleteUrl(secretKey), { method: "DELETE" });
      await mutate();
    } finally {
      setRemovingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="KEY_NAME"
          aria-label="Secret key"
        />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="value (write-only)"
          type="password"
          aria-label="Secret value"
        />
        <Button onClick={handleSave} disabled={isSaving} className="shrink-0">
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Set
        </Button>
      </div>
      <Input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="description (optional)"
        aria-label="Secret description"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="divide-y divide-border rounded-md border border-border">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : secrets.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">
            No secrets set.
          </p>
        ) : (
          secrets.map((secret) => (
            <div
              key={secret.id}
              className="flex items-center justify-between gap-4 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{secret.key}</p>
                {secret.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {secret.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={removingKey === secret.key}
                onClick={() => handleRemove(secret.key)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                {removingKey === secret.key ? (
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
