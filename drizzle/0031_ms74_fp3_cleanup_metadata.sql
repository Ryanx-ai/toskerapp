CREATE TABLE "location_cleanup_budget" (
	"day" text PRIMARY KEY NOT NULL,
	"reserved" integer NOT NULL,
	CONSTRAINT "location_cleanup_budget_valid" CHECK ("location_cleanup_budget"."reserved" between 1 and 100),
	CONSTRAINT "location_cleanup_budget_day_valid" CHECK ("location_cleanup_budget"."day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "location_cleanup_health" (
	"slot" integer PRIMARY KEY NOT NULL,
	"ready_nonce" uuid,
	"ready_requested_at" timestamp with time zone,
	"ready_ack_at" timestamp with time zone,
	"rescue_at" timestamp with time zone,
	"failure_at" timestamp with time zone,
	CONSTRAINT "location_cleanup_health_slot_valid" CHECK ("location_cleanup_health"."slot" = 1)
);
--> statement-breakpoint
CREATE TABLE "location_cleanup_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"armed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "location_cleanup_reservation_lifetime_valid" CHECK ("location_cleanup_reservations"."expires_at" = "location_cleanup_reservations"."created_at" + interval '5 minutes')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "location_cleanup_reservation_scope_unique" ON "location_cleanup_reservations" USING btree ("id","expires_at","armed");--> statement-breakpoint
CREATE INDEX "location_cleanup_reservation_expiry_idx" ON "location_cleanup_reservations" USING btree ("expires_at");