CREATE TABLE "location_cleanup_workers" (
	"slot" integer PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"last_sweep_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	CONSTRAINT "location_cleanup_worker_slot_valid" CHECK ("location_cleanup_workers"."slot" = 1),
	CONSTRAINT "location_cleanup_worker_window_valid" CHECK ("location_cleanup_workers"."ends_at" > "location_cleanup_workers"."started_at" and "location_cleanup_workers"."ends_at" <= "location_cleanup_workers"."started_at" + interval '4 hours' and "location_cleanup_workers"."last_sweep_at" >= "location_cleanup_workers"."started_at" and "location_cleanup_workers"."last_sweep_at" <= "location_cleanup_workers"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "location_latest" (
	"lease_id" uuid PRIMARY KEY NOT NULL,
	"worker_run_id" uuid NOT NULL,
	"precision" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"revision" integer NOT NULL,
	"request_id" uuid NOT NULL,
	"label" text NOT NULL,
	"source" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy" double precision,
	CONSTRAINT "location_latest_revision_valid" CHECK ("location_latest"."revision" > 0),
	CONSTRAINT "location_latest_lifetime_valid" CHECK ("location_latest"."accepted_at" < "location_latest"."expires_at" and "location_latest"."accepted_at" >= "location_latest"."expires_at" - interval '5 minutes'),
	CONSTRAINT "location_latest_text_valid" CHECK (length(trim("location_latest"."label")) between 1 and 100 and "location_latest"."source" in ('ura','geoapify')),
	CONSTRAINT "location_latest_precision_valid" CHECK (("location_latest"."precision" = 'area' and "location_latest"."latitude" is null and "location_latest"."longitude" is null and "location_latest"."accuracy" is null) or ("location_latest"."precision" = 'precise' and "location_latest"."latitude" is not null and "location_latest"."longitude" is not null and "location_latest"."accuracy" is not null and "location_latest"."latitude" between -90 and 90 and "location_latest"."longitude" between -180 and 180 and "location_latest"."accuracy" between 0 and 100000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "location_cleanup_worker_run_unique" ON "location_cleanup_workers" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "location_latest_expiry_idx" ON "location_latest" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "location_shares_snapshot_scope_unique" ON "location_shares" USING btree ("id","precision","expires_at");--> statement-breakpoint
ALTER TABLE "location_latest" ADD CONSTRAINT "location_latest_worker_run_id_location_cleanup_workers_run_id_fk" FOREIGN KEY ("worker_run_id") REFERENCES "public"."location_cleanup_workers"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_latest" ADD CONSTRAINT "location_latest_consent_scope_fk" FOREIGN KEY ("lease_id","precision","expires_at") REFERENCES "public"."location_shares"("id","precision","expires_at") ON DELETE cascade ON UPDATE no action;
