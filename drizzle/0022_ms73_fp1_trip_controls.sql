DROP INDEX "trip_plans_room_unique";--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_plans" ADD COLUMN "subroom_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_routes" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_subroom_id_subrooms_id_fk" FOREIGN KEY ("subroom_id") REFERENCES "public"."subrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_plans_subroom_unique" ON "trip_plans" USING btree ("subroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_plans_room_unique" ON "trip_plans" USING btree ("room_id") WHERE "trip_plans"."subroom_id" is null;--> statement-breakpoint
-- Preserve the pre-FP1 deterministic route order; no place/membership content changes.
WITH ordered AS (SELECT id, row_number() OVER (PARTITION BY plan_id ORDER BY created_at, id) - 1 AS ordinal FROM trip_routes)
UPDATE trip_routes SET position = ordered.ordinal FROM ordered WHERE trip_routes.id = ordered.id;
