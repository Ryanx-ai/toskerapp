CREATE TABLE "trip_mutation_receipts" (
	"plan_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"revision" integer NOT NULL,
	"result_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_mutation_receipts_plan_id_actor_id_request_id_pk" PRIMARY KEY("plan_id","actor_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "trip_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"source" text NOT NULL,
	"provider" text,
	"provider_id" text,
	"address" text DEFAULT '' NOT NULL,
	"attribution" text DEFAULT '' NOT NULL,
	"license" text DEFAULT '' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_places_latitude_valid" CHECK ("trip_places"."latitude" >= -90 and "trip_places"."latitude" <= 90),
	CONSTRAINT "trip_places_longitude_valid" CHECK ("trip_places"."longitude" >= -180 and "trip_places"."longitude" <= 180),
	CONSTRAINT "trip_places_text_valid" CHECK (length("trip_places"."title") between 1 and 120 and length("trip_places"."note") <= 1000 and length("trip_places"."address") <= 400 and length("trip_places"."attribution") <= 500 and length("trip_places"."license") <= 120),
	CONSTRAINT "trip_places_source_valid" CHECK ("trip_places"."source" in ('search', 'pin'))
);
--> statement-breakpoint
CREATE TABLE "trip_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_plans_revision_valid" CHECK ("trip_plans"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trip_route_places" (
	"plan_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"is_stop" boolean DEFAULT true NOT NULL,
	CONSTRAINT "trip_route_places_route_id_place_id_pk" PRIMARY KEY("route_id","place_id"),
	CONSTRAINT "trip_route_places_position_valid" CHECK ("trip_route_places"."position" >= 0 and "trip_route_places"."position" < 200)
);
--> statement-breakpoint
CREATE TABLE "trip_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gold' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_routes_name_valid" CHECK (length("trip_routes"."name") between 1 and 60),
	CONSTRAINT "trip_routes_color_valid" CHECK ("trip_routes"."color" in ('gold', 'rose', 'sage', 'sky', 'iris'))
);
--> statement-breakpoint
-- Referenced composite uniqueness must exist before adding scoped foreign keys.
CREATE UNIQUE INDEX "trip_places_plan_id_unique" ON "trip_places" USING btree ("plan_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_routes_plan_id_unique" ON "trip_routes" USING btree ("plan_id","id");--> statement-breakpoint
ALTER TABLE "trip_mutation_receipts" ADD CONSTRAINT "trip_mutation_receipts_plan_id_trip_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."trip_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_mutation_receipts" ADD CONSTRAINT "trip_mutation_receipts_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_plan_id_trip_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."trip_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_route_places" ADD CONSTRAINT "trip_route_places_route_fk" FOREIGN KEY ("plan_id","route_id") REFERENCES "public"."trip_routes"("plan_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_route_places" ADD CONSTRAINT "trip_route_places_place_fk" FOREIGN KEY ("plan_id","place_id") REFERENCES "public"."trip_places"("plan_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_routes" ADD CONSTRAINT "trip_routes_plan_id_trip_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."trip_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_places_provider_unique" ON "trip_places" USING btree ("plan_id","provider","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_plans_room_unique" ON "trip_plans" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "trip_route_places_plan_idx" ON "trip_route_places" USING btree ("plan_id");
