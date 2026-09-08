CREATE TABLE "message_mentions" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start" integer NOT NULL,
	"length" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "message_mentions_message_id_start_pk" PRIMARY KEY("message_id","start")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_mention" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_mentions_user_idx" ON "message_mentions" USING btree ("user_id");