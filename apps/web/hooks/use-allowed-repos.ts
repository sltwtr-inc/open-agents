"use client";

import useSWR from "swr";
import { z } from "zod";
import { fetcher } from "@/lib/swr";

const allowedRepoSchema = z.object({
  owner: z.string(),
  name: z.string(),
  full_name: z.string(),
  defaultBranch: z.string().nullable(),
});

const allowedReposSchema = z.array(allowedRepoSchema);

export type AllowedRepo = z.infer<typeof allowedRepoSchema>;

interface UseAllowedReposReturn {
  repos: AllowedRepo[];
  isLoading: boolean;
  error: string | null;
}

async function fetchAllowedRepos(url: string): Promise<AllowedRepo[]> {
  const json = await fetcher<unknown>(url);
  const parsed = allowedReposSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid repositories response");
  }
  return parsed.data;
}

/**
 * Repositories the team is allowed to launch sessions on (admin-curated). Used
 * by the member-facing repo picker.
 */
export function useAllowedRepos(): UseAllowedReposReturn {
  const { data, error, isLoading } = useSWR<AllowedRepo[]>(
    "/api/repos",
    fetchAllowedRepos,
    { dedupingInterval: 5_000 },
  );

  return {
    repos: data ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}
