"use client";

import { CheckCircle2, Github, Loader2 } from "lucide-react";
import useSWR from "swr";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/swr";

const orgInstallSchema = z.object({
  appSlug: z.string().nullable(),
  installation: z
    .object({
      installationId: z.number(),
      accountLogin: z.string(),
      accountType: z.enum(["User", "Organization"]),
      repositorySelection: z.enum(["all", "selected"]),
      installationUrl: z.string().nullable(),
    })
    .nullable(),
});

type OrgInstall = z.infer<typeof orgInstallSchema>;

async function fetchOrgInstall(url: string): Promise<OrgInstall> {
  const json = await fetcher<unknown>(url);
  const parsed = orgInstallSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid response");
  }
  return parsed.data;
}

export function OrgGitHubSection() {
  const { data, isLoading } = useSWR<OrgInstall>(
    "/api/admin/github-install",
    fetchOrgInstall,
  );

  function startInstall() {
    window.location.href = "/api/github/app/install?next=/settings/admin";
  }

  const installation = data?.installation ?? null;

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Org GitHub Connection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Install the SLTWTR GitHub App once for the team. Every member&apos;s
          sessions clone through this installation — they do not connect GitHub
          individually.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        {isLoading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </span>
        ) : installation ? (
          <span className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-500" />
            Connected to{" "}
            <span className="font-medium">
              {installation.accountLogin}
            </span> (
            {installation.repositorySelection === "all"
              ? "all repos"
              : "selected repos"}
            )
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            No GitHub App installed yet.
          </span>
        )}

        <Button variant="outline" size="sm" onClick={startInstall}>
          <Github className="size-4" />
          {installation ? "Manage / reinstall" : "Connect GitHub App"}
        </Button>
      </div>
    </div>
  );
}
