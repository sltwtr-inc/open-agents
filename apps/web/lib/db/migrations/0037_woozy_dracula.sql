CREATE TABLE "org_allowed_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"repository_id" integer NOT NULL,
	"default_branch" text,
	"clone_url" text NOT NULL,
	"added_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_github_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"repository_selection" text NOT NULL,
	"installation_url" text,
	"configured_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_github_installation_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
ALTER TABLE "org_allowed_repos" ADD CONSTRAINT "org_allowed_repos_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_github_installation" ADD CONSTRAINT "org_github_installation_configured_by_user_id_users_id_fk" FOREIGN KEY ("configured_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_allowed_repos_owner_repo_idx" ON "org_allowed_repos" USING btree (lower("owner"),lower("repo"));