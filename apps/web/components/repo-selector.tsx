"use client";

import { BookIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAllowedRepos } from "@/hooks/use-allowed-repos";
import { cn } from "@/lib/utils";

export function RepoSelector({
  onRepoSelect,
}: {
  onRepoSelect: (owner: string, repo: string) => void;
}) {
  const { repos, isLoading, error } = useAllowedRepos();
  const [selectedFullName, setSelectedFullName] = useState("");
  const [repoOpen, setRepoOpen] = useState(false);

  const handleRepoSelect = (fullName: string) => {
    const repo = repos.find((r) => r.full_name === fullName);
    if (!repo) {
      return;
    }
    setSelectedFullName(repo.full_name);
    onRepoSelect(repo.owner, repo.name);
    setRepoOpen(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!isLoading && repos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No repositories available. Ask an admin to add repositories in Settings
        → Admin.
      </p>
    );
  }

  return (
    <Popover open={repoOpen} onOpenChange={setRepoOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={repoOpen}
          className="w-64 justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <BookIcon className="size-4 shrink-0" />
            {isLoading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : selectedFullName ? (
              <span className="truncate">{selectedFullName}</span>
            ) : (
              <span className="text-muted-foreground">Select repository</span>
            )}
          </div>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search repositories..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading..." : "No repositories found."}
            </CommandEmpty>
            <CommandGroup>
              {repos.map((repo) => (
                <CommandItem
                  key={repo.full_name}
                  value={repo.full_name}
                  onSelect={() => handleRepoSelect(repo.full_name)}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 size-4",
                      selectedFullName === repo.full_name
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{repo.full_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
