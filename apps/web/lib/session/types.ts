export interface Session {
  created: number;
  authProvider: "vercel" | "github";
  user: {
    id: string;
    username: string;
    email: string | undefined;
    avatar: string;
    name?: string;
  };
}

export interface SessionUserInfo {
  user: Session["user"] | undefined;
  authProvider?: "vercel" | "github";
  isAdmin?: boolean;
  isManagedTemplateTrialUser?: boolean;
  hasGitHub?: boolean;
  hasGitHubAccount?: boolean;
  hasGitHubInstallations?: boolean;
  /**
   * Whether the org-wide GitHub App is configured. Under the single-org model
   * this — not per-user installs — governs whether repo-backed sessions work.
   */
  orgGitHubReady?: boolean;
}
