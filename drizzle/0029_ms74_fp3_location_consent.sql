CREATE TABLE "location_shares" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"precision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "location_shares_precision_valid" CHECK ("location_shares"."precision" in ('area','precise')),
	CONSTRAINT "location_shares_lifetime_valid" CHECK ("location_shares"."expires_at" > "location_shares"."created_at" and "location_shares"."expires_at" <= "location_shares"."created_at" + interval '5 minutes'),
	CONSTRAINT "location_shares_session_valid" CHECK (length("location_shares"."session_id") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "location_shares" ADD CONSTRAINT "location_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_shares" ADD CONSTRAINT "location_shares_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "location_shares_lease_unique" ON "location_shares" USING btree ("id");--> statement-breakpoint
CREATE INDEX "location_shares_context_idx" ON "location_shares" USING btree ("conversation_id");