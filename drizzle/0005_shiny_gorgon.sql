ALTER TABLE "hall_items" ALTER COLUMN "room_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hall_items" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
UPDATE "hall_items"
SET "conversation_id" = "conversations"."id"
FROM "conversations"
WHERE "hall_items"."room_id" = "conversations"."room_id"
  AND "conversations"."kind" = 'room'
  AND "conversations"."is_primary" = true;--> statement-breakpoint
ALTER TABLE "hall_items" ADD CONSTRAINT "hall_items_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
