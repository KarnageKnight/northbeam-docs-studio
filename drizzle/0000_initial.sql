CREATE TABLE "article_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tags" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "article_versions_number_unique" UNIQUE("article_id","version_number"),
	CONSTRAINT "article_versions_owner_id_unique" UNIQUE("article_id","id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"draft_title" text NOT NULL,
	"draft_body" text DEFAULT '' NOT NULL,
	"draft_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"next_version_number" integer DEFAULT 1 NOT NULL,
	"current_published_version_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_status_check" CHECK ("articles"."status" IN ('draft', 'published', 'unpublished'))
);
--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_published_version_fk" FOREIGN KEY ("id","current_published_version_id") REFERENCES "public"."article_versions"("article_id","id") ON DELETE restrict ON UPDATE no action;