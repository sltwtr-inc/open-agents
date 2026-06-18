"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type AllowedRepo, useAllowedRepos } from "@/hooks/use-allowed-repos";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface RepoSelectorCompactProps {
  selectedOwner: string;
  selectedRepo: string;
  onSelect: (owner: string, repo: string) => void;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-5 w-[120px] animate-pulse rounded bg-muted-foreground/10" />
        <div className="h-4 w-[48px] animate-pulse rounded bg-muted-foreground/10" />
      </div>
      <div className="h-[26px] w-[52px] shrink-0 animate-pulse rounded-md bg-muted-foreground/10" />
    </div>
  );
}

export function RepoSelectorCompact({
  selectedOwner,
  selectedRepo,
  onSelect,
}: RepoSelectorCompactProps) {
  const { repos, isLoading, error } = useAllowedRepos();
  const [repoSearch, setRepoSearch] = useState("");
  const [debouncedRepoSearch, setDebouncedRepoSearch] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedRepoSearch(repoSearch.trim());
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [repoSearch]);

  // Sort repos alphabetically by full_name, then apply client-side search.
  const filteredRepos = useMemo(() => {
    const sorted = [...repos].sort((a, b) =>
      a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase()),
    );
    const query = debouncedRepoSearch.toLowerCase();
    if (!query) {
      return sorted;
    }
    return sorted.filter((repo) =>
      repo.full_name.toLowerCase().includes(query),
    );
  }, [repos, debouncedRepoSearch]);

  const handleRepoSelect = (repo: AllowedRepo) => {
    onSelect(repo.owner, repo.name);
  };

  const handleDeselect = () => {
    onSelect(selectedOwner, "");
  };

  const hasSelection = selectedOwner && selectedRepo;

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border/70 px-4 py-6 text-center text-sm text-muted-foreground dark:border-white/10">
        {error}
      </div>
    );
  }

  if (!isLoading && repos.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border/70 px-4 py-6 text-center text-sm text-muted-foreground dark:border-white/10">
        No repositories available. Ask an admin to add repositories in Settings
        → Admin.
      </div>
    );
  }

  // Collapsed state: repo is selected
  if (hasSelection) {
    return (
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-border/70 dark:border-white/10">
          {/* Owner display */}
          <div className="flex shrink-0 items-center gap-2 border-r border-border/70 bg-background/80 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/[0.03]">
            <GitHubIcon className="size-4 shrink-0" />
            <span className="max-w-[140px] truncate font-medium">
              {selectedOwner}
            </span>
          </div>

          {/* Selected repo display */}
          <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
            <span className="truncate text-sm font-medium">{selectedRepo}</span>
          </div>

          {/* Change button */}
          <button
            type="button"
            onClick={handleDeselect}
            className="shrink-0 px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // Expanded state: no selection, show full list
  return (
    <div className="flex flex-col gap-0">
      {/* Top bar: search */}
      <div className="flex items-stretch gap-0 overflow-hidden rounded-t-lg border border-border/70 dark:border-white/10">
        {/* Search input */}
        <div className="flex flex-1 items-center gap-2 bg-background/80 px-3 dark:bg-white/[0.03]">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={repoSearch}
            onChange={(e) => setRepoSearch(e.target.value)}
            className="h-full w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {repoSearch && (
            <button
              type="button"
              onClick={() => setRepoSearch("")}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Esc
            </button>
          )}
        </div>
      </div>

      {/* Repo list */}
      <div className="h-[280px] overflow-y-auto rounded-b-lg border border-t-0 border-border/70 dark:border-white/10">
        {isLoading ? (
          <div className="flex h-full flex-col divide-y divide-border/50 dark:divide-white/[0.06]">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <div className="flex-1" />
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
            No repositories found.
          </div>
        ) : (
          <div className="divide-y divide-border/50 dark:divide-white/[0.06]">
            {filteredRepos.map((repo) => (
              <div
                key={repo.full_name}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30 dark:hover:bg-white/[0.03]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {repo.full_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRepoSelect(repo)}
                  className="shrink-0 rounded-md border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent dark:border-white/20 dark:bg-white/[0.06] dark:hover:bg-white/10"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
