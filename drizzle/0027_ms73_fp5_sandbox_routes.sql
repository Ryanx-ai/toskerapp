-- Forward-compatible extension: retain all old fields/rows and FP4B memory.
-- Replace the context CHECK atomically; never leave an unconstrained committed state.
LOCK TABLE trip_plans, trip_places IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
ALTER TABLE "trip_plans" DROP CONSTRAINT "trip_plans_context_valid";--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "icon" text DEFAULT 'destination' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_plans" ADD COLUMN "sandbox_conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_sandbox_conversation_id_conversations_id_fk" FOREIGN KEY ("sandbox_conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_plans_sandbox_unique" ON "trip_plans" USING btree ("sandbox_conversation_id");--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_icon_valid" CHECK ("trip_places"."icon" in ('destination', 'checkpoint', 'home', 'work', 'food', 'stay', 'activity', 'favourite', 'meetup'));--> statement-breakpoint
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_context_valid" CHECK (("trip_plans"."room_id" is not null and "trip_plans"."personal_conversation_id" is null and "trip_plans"."sandbox_conversation_id" is null) or ("trip_plans"."room_id" is null and "trip_plans"."subroom_id" is null and "trip_plans"."personal_conversation_id" is not null and "trip_plans"."sandbox_conversation_id" is null) or ("trip_plans"."room_id" is null and "trip_plans"."subroom_id" is null and "trip_plans"."personal_conversation_id" is null and "trip_plans"."sandbox_conversation_id" is not null));
