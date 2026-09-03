ALTER TABLE "conversations" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_primary_room_unique" ON "conversations" USING btree ("room_id") WHERE "conversations"."kind" = 'room' and "conversations"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_slug_unique" ON "rooms" USING btree ("slug");