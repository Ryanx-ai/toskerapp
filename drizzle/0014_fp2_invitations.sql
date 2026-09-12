CREATE TYPE "public"."invite_kind" AS ENUM('legacy', 'direct', 'share');--> statement-breakpoint
ALTER TYPE "public"."invite_status" ADD VALUE 'declined';--> statement-breakpoint
CREATE TABLE "invite_rate_limits" (
	"user_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"attempts" integer NOT NULL,
	CONSTRAINT "invite_rate_limits_user_id_operation_pk" PRIMARY KEY("user_id","operation")
);
--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "kind" "invite_kind" DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "encrypted_token" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "invitation_id" uuid;--> statement-breakpoint
ALTER TABLE "invite_rate_limits" ADD CONSTRAINT "invite_rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_invitation_id_invites_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invites_active_share_unique" ON "invites" USING btree ("room_id") WHERE "invites"."kind" = 'share' and "invites"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "invites_pending_direct_unique" ON "invites" USING btree ("room_id","recipient_user_id") WHERE "invites"."kind" = 'direct' and "invites"."status" = 'pending';