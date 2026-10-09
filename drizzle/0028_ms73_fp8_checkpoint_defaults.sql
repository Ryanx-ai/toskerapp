ALTER TABLE "trip_places" ADD COLUMN "default_title" text;--> statement-breakpoint
-- Preserve every existing title and coordinate. A legacy custom name has no
-- recoverable original; assign a stable canonical default after reserved names.
SELECT set_config('tosker.trip_protocol','4',true);--> statement-breakpoint
WITH reserved AS (
  SELECT route_id, coalesce(max(substring(title from '^Checkpoint ([1-9][0-9]*)$')::numeric),0) AS last_number
  FROM trip_places WHERE source='pin' AND provider_id IS NULL GROUP BY route_id
), unnamed AS (
  SELECT p.id, r.last_number + row_number() OVER (PARTITION BY p.route_id ORDER BY p.created_at,p.id) AS number
  FROM trip_places p JOIN reserved r ON r.route_id=p.route_id
  WHERE p.source='pin' AND p.provider_id IS NULL AND p.title !~ '^Checkpoint [1-9][0-9]*$'
)
UPDATE trip_places p SET default_title='Checkpoint ' || u.number::text FROM unnamed u WHERE p.id=u.id;--> statement-breakpoint
UPDATE trip_places SET default_title=title WHERE source='pin' AND provider_id IS NULL AND title ~ '^Checkpoint [1-9][0-9]*$';--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_default_title_valid" CHECK ("trip_places"."default_title" is null or ("trip_places"."source" = 'pin' and "trip_places"."provider_id" is null and "trip_places"."default_title" ~ '^Checkpoint [1-9][0-9]*$' and length("trip_places"."default_title") <= 120));
