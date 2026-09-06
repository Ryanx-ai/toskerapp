CREATE TYPE "public"."hall_reaction_kind" AS ENUM('heart', 'like', 'celebrate');--> statement-breakpoint
CREATE TABLE "hall_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_reactions" (
	"item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction" "hall_reaction_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hall_reactions_item_id_user_id_reaction_pk" PRIMARY KEY("item_id","user_id","reaction")
);
--> statement-breakpoint
ALTER TABLE "hall_items" ADD COLUMN "image_path" text;--> statement-breakpoint
ALTER TABLE "hall_items" ADD COLUMN "image_alt" text;--> statement-breakpoint
ALTER TABLE "hall_comments" ADD CONSTRAINT "hall_comments_item_id_hall_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hall_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_comments" ADD CONSTRAINT "hall_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_reactions" ADD CONSTRAINT "hall_reactions_item_id_hall_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hall_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_reactions" ADD CONSTRAINT "hall_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hall_comments_item_idx" ON "hall_comments" USING btree ("item_id","created_at");