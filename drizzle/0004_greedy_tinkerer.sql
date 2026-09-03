ALTER TABLE "connections" ADD COLUMN "pair_key" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "connections_pair_unique" ON "connections" USING btree ("pair_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hall_items_pinned_message_unique" ON "hall_items" USING btree ("source_message_id") WHERE "hall_items"."kind" = 'pinned_message';