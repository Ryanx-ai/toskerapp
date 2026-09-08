ALTER TABLE "conversation_reads" ADD COLUMN "muted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_reads" ADD COLUMN "manual_chat_unread_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_reads" ADD COLUMN "manual_hall_unread_id" uuid;