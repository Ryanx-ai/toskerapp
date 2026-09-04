CREATE TABLE "conversation_reads" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_reads_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "hall_items" ADD COLUMN "color" text DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "hall_items" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hall_items" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY COALESCE("conversation_id"::text, "room_id"::text)
    ORDER BY "created_at", "id"
  ) - 1 AS "position"
  FROM "hall_items"
  WHERE "archived_at" IS NULL
)
UPDATE "hall_items" AS h
SET "position" = ranked."position"
FROM ranked
WHERE h."id" = ranked."id";--> statement-breakpoint
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_reads_user_idx" ON "conversation_reads" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
