-- Forward-only capability addition. No rows, identities or historical migrations
-- are rewritten. Older protocol-4 applications retain ordinary write compatibility.
LOCK TABLE trip_places, trip_route_places IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION tosker_fp3_card_projection() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.plan_id<>OLD.plan_id OR NEW.id<>OLD.id) THEN
  RAISE EXCEPTION 'A Location Card cannot change context or identity' USING ERRCODE='55000';
 END IF;
 IF TG_OP='UPDATE' AND NEW.route_id<>OLD.route_id THEN
  -- An intentional, exact-card transfer marker, not an authorization substitute.
  -- The service reauthorizes the context and locks the plan before setting this.
  IF coalesce(current_setting('tosker.trip_move',true),'')<>OLD.id::text||':'||NEW.route_id::text THEN
   RAISE EXCEPTION 'Use the authorized Move to Route operation' USING ERRCODE='55000';
  END IF;
  DELETE FROM trip_route_places WHERE plan_id=OLD.plan_id AND route_id=OLD.route_id AND place_id=OLD.id;
 END IF;
 INSERT INTO trip_route_places (plan_id,route_id,place_id,position,is_stop)
 VALUES (NEW.plan_id,NEW.route_id,NEW.id,NEW.position,NEW.is_stop)
 ON CONFLICT (route_id,place_id) DO UPDATE SET position=EXCLUDED.position,is_stop=EXCLUDED.is_stop;
 RETURN NEW;
END $$;
