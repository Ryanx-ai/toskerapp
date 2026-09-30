CREATE TABLE "trip_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_comments_body_valid" CHECK (length("trip_comments"."body") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "trip_plans" ALTER COLUMN "room_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_plans" ADD COLUMN "personal_conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_comments" ADD CONSTRAINT "trip_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_comments" ADD CONSTRAINT "trip_comments_place_fk" FOREIGN KEY ("plan_id","place_id") REFERENCES "public"."trip_places"("plan_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_comments_place_idx" ON "trip_comments" USING btree ("place_id","created_at","id");--> statement-breakpoint
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_personal_conversation_id_conversations_id_fk" FOREIGN KEY ("personal_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_plans_personal_unique" ON "trip_plans" USING btree ("personal_conversation_id");--> statement-breakpoint
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_context_valid" CHECK (("trip_plans"."room_id" is not null and "trip_plans"."personal_conversation_id" is null) or ("trip_plans"."room_id" is null and "trip_plans"."subroom_id" is null and "trip_plans"."personal_conversation_id" is not null));