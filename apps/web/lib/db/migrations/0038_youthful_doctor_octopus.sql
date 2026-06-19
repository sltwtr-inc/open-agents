CREATE TABLE "org_secrets" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value_ciphertext" text NOT NULL,
	"description" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_secrets" (
	"id" text PRIMARY KEY NOT NULL,
	"allowed_repo_id" text NOT NULL,
	"key" text NOT NULL,
	"value_ciphertext" text NOT NULL,
	"description" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"scope" text NOT NULL,
	"secret_key" text NOT NULL,
	"allowed_repo_id" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_allowed_repos" ADD COLUMN "secrets_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "org_secrets" ADD CONSTRAINT "org_secrets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_secrets" ADD CONSTRAINT "repo_secrets_allowed_repo_id_org_allowed_repos_id_fk" FOREIGN KEY ("allowed_repo_id") REFERENCES "public"."org_allowed_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_secrets" ADD CONSTRAINT "repo_secrets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_audit_log" ADD CONSTRAINT "secret_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_secrets_key_idx" ON "org_secrets" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_secrets_repo_key_idx" ON "repo_secrets" USING btree ("allowed_repo_id","key");--> statement-breakpoint
CREATE INDEX "secret_audit_log_created_at_idx" ON "secret_audit_log" USING btree ("created_at");