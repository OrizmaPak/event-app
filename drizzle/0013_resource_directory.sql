CREATE TABLE "resource_listing_terms" (
	"listing_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	CONSTRAINT "resource_listing_terms_listing_id_term_id_pk" PRIMARY KEY("listing_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "resource_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"owner_user_id" uuid,
	"organizer_id" uuid,
	"created_by" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"approved_content" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_version" integer,
	"publication" text DEFAULT 'unpublished' NOT NULL,
	"review" text DEFAULT 'draft' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_listings_one_owner" CHECK (num_nonnulls("resource_listings"."organizer_id", "resource_listings"."owner_user_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "resource_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"decision" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposed_by" uuid,
	"merged_into_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "organizer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "resource_listing_terms" ADD CONSTRAINT "resource_listing_terms_listing_id_resource_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."resource_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_listing_terms" ADD CONSTRAINT "resource_listing_terms_term_id_resource_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."resource_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_listings" ADD CONSTRAINT "resource_listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_listings" ADD CONSTRAINT "resource_listings_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_listings" ADD CONSTRAINT "resource_listings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_revisions" ADD CONSTRAINT "resource_revisions_listing_id_resource_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."resource_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_revisions" ADD CONSTRAINT "resource_revisions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_revisions" ADD CONSTRAINT "resource_revisions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_terms" ADD CONSTRAINT "resource_terms_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_listing_terms_term_idx" ON "resource_listing_terms" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_listings_slug_uidx" ON "resource_listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "resource_listings_public_idx" ON "resource_listings" USING btree ("publication","published_at");--> statement-breakpoint
CREATE INDEX "resource_listings_organizer_idx" ON "resource_listings" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "resource_listings_user_idx" ON "resource_listings" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_revisions_version_uidx" ON "resource_revisions" USING btree ("listing_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_terms_name_uidx" ON "resource_terms" USING btree ("kind","normalized_name");--> statement-breakpoint
CREATE INDEX "resource_terms_status_idx" ON "resource_terms" USING btree ("status");--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_one_owner" CHECK (num_nonnulls("media_assets"."organizer_id", "media_assets"."owner_user_id") = 1);