-- Atomic forward cutover. Legacy joins are a read-only compatibility projection, not ownership.
LOCK TABLE trip_plans, trip_routes, trip_places, trip_route_places, trip_comments, trip_mutation_receipts IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM trip_places p WHERE NOT EXISTS (SELECT 1 FROM trip_route_places m WHERE m.place_id=p.id AND m.plan_id=p.plan_id)) THEN RAISE EXCEPTION 'FP3 requires explicit disposition of unassigned cards'; END IF;
  IF EXISTS (SELECT 1 FROM trip_route_places GROUP BY plan_id HAVING count(*)>200) THEN RAISE EXCEPTION 'FP3 route-owned backfill exceeds bounded plan capacity'; END IF;
END $$;
--> statement-breakpoint
CREATE TEMP TABLE fp3_card_map ON COMMIT DROP AS
SELECT p.id AS legacy_id,m.route_id,m.position,m.is_stop,
 CASE WHEN row_number() OVER (PARTITION BY p.id ORDER BY r.position,r.created_at,r.id)=1 THEN p.id ELSE md5('tosker-fp3-card:'||p.id::text||':'||r.id::text)::uuid END AS card_id
FROM trip_places p JOIN trip_route_places m ON m.place_id=p.id AND m.plan_id=p.plan_id JOIN trip_routes r ON r.id=m.route_id AND r.plan_id=m.plan_id;
--> statement-breakpoint
DROP INDEX trip_places_provider_unique;
--> statement-breakpoint
ALTER TABLE trip_places ADD COLUMN route_id uuid;
--> statement-breakpoint
ALTER TABLE trip_places ADD COLUMN position integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE trip_places ADD COLUMN is_stop boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE trip_places p SET route_id=m.route_id,position=m.position,is_stop=m.is_stop FROM fp3_card_map m WHERE p.id=m.card_id AND m.card_id=m.legacy_id;
--> statement-breakpoint
INSERT INTO trip_places (id,plan_id,route_id,position,is_stop,title,note,starred,latitude,longitude,source,provider,provider_id,address,attribution,license,archived_at,created_at,updated_at)
SELECT m.card_id,p.plan_id,m.route_id,m.position,m.is_stop,p.title,p.note,p.starred,p.latitude,p.longitude,p.source,p.provider,p.provider_id,p.address,p.attribution,p.license,p.archived_at,p.created_at,p.updated_at
FROM fp3_card_map m JOIN trip_places p ON p.id=m.legacy_id WHERE m.card_id<>m.legacy_id;
--> statement-breakpoint
-- Founder-approved lossless copy: original author/time/body, deterministic fresh comment IDs.
INSERT INTO trip_comments (id,plan_id,place_id,author_id,body,created_at)
SELECT md5('tosker-fp3-comment:'||c.id::text||':'||m.route_id::text)::uuid,c.plan_id,m.card_id,c.author_id,c.body,c.created_at FROM trip_comments c JOIN fp3_card_map m ON m.legacy_id=c.place_id WHERE m.card_id<>m.legacy_id;
--> statement-breakpoint
DELETE FROM trip_route_places;
--> statement-breakpoint
INSERT INTO trip_route_places (plan_id,route_id,place_id,position,is_stop) SELECT plan_id,route_id,id,position,is_stop FROM trip_places;
--> statement-breakpoint
ALTER TABLE trip_places ALTER COLUMN route_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE trip_places ADD CONSTRAINT trip_places_route_owner_fk FOREIGN KEY (plan_id,route_id) REFERENCES trip_routes(plan_id,id) ON DELETE CASCADE;
--> statement-breakpoint
CREATE UNIQUE INDEX trip_places_route_provider_unique ON trip_places (route_id,provider,provider_id);
--> statement-breakpoint
ALTER TABLE trip_places ADD CONSTRAINT trip_places_position_valid CHECK (position>=0 AND position<200);
--> statement-breakpoint
UPDATE trip_plans SET revision=revision+1,updated_at=now();
--> statement-breakpoint
CREATE FUNCTION tosker_fp3_trip_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF pg_trigger_depth()<=1 AND (coalesce(current_setting('tosker.trip_protocol',true),'')<>'3' OR TG_TABLE_NAME='trip_route_places') THEN RAISE EXCEPTION 'Map was updated. Reload before making changes.' USING ERRCODE='55000'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION tosker_fp3_card_projection() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.route_id<>OLD.route_id OR NEW.plan_id<>OLD.plan_id) THEN RAISE EXCEPTION 'A Location Card cannot change owning route'; END IF;
 INSERT INTO trip_route_places (plan_id,route_id,place_id,position,is_stop) VALUES (NEW.plan_id,NEW.route_id,NEW.id,NEW.position,NEW.is_stop) ON CONFLICT (route_id,place_id) DO UPDATE SET position=EXCLUDED.position,is_stop=EXCLUDED.is_stop;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER trip_places_fp3_projection AFTER INSERT OR UPDATE ON trip_places FOR EACH ROW EXECUTE FUNCTION tosker_fp3_card_projection();
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['trip_plans','trip_routes','trip_places','trip_route_places','trip_comments','trip_mutation_receipts'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION tosker_fp3_trip_write_guard()',t||'_fp3_guard',t);
 END LOOP;
END $$;
