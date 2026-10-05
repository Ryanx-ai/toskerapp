-- Additive FP4A: preserve every owned card/comment/receipt; no ownership rewrite.
LOCK TABLE trip_plans, trip_routes, trip_places, trip_route_places, trip_comments, trip_mutation_receipts IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "skipped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_routes" ADD COLUMN "locked_positions" integer[] DEFAULT ARRAY[0]::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_routes" ADD CONSTRAINT "trip_routes_locks_valid" CHECK (cardinality("trip_routes"."locked_positions") <= 200 and (cardinality("trip_routes"."locked_positions") = 0 or (array_ndims("trip_routes"."locked_positions") = 1 and array_position("trip_routes"."locked_positions", null) is null and 0 <= all("trip_routes"."locked_positions") and 200 > all("trip_routes"."locked_positions"))));
--> statement-breakpoint
CREATE FUNCTION tosker_fp4a_trip_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF pg_trigger_depth()<=1 AND (coalesce(current_setting('tosker.trip_protocol',true),'')<>'4' OR TG_TABLE_NAME='trip_route_places') THEN RAISE EXCEPTION 'Map was updated. Reload before making changes.' USING ERRCODE='55000'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['trip_plans','trip_routes','trip_places','trip_route_places','trip_comments','trip_mutation_receipts'] LOOP
  EXECUTE format('DROP TRIGGER %I ON %I',t||'_fp3_guard',t);
  EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION tosker_fp4a_trip_write_guard()',t||'_fp3_guard',t);
 END LOOP;
END $$;
