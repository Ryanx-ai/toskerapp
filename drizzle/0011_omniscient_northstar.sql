ALTER TABLE "notifications" ADD COLUMN "destination_read_at" timestamp with time zone;
--> statement-breakpoint
-- Preserve legacy acknowledged activity; its original surface/list intent cannot be reconstructed.
UPDATE "notifications" SET "destination_read_at" = "read_at" WHERE "read_at" IS NOT NULL;
