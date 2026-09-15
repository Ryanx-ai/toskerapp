CREATE TYPE "public"."identity_accent" AS ENUM('neutral', 'gold', 'rose', 'sage', 'sky');--> statement-breakpoint
CREATE TYPE "public"."profile_audience" AS ENUM('self', 'friends', 'shared_context');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "details_audience" "profile_audience" DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "status_audience" "profile_audience" DEFAULT 'shared_context' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "identity_accent" "identity_accent" DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Existing canonical writers also advance the revision during the local rollout.
-- No profile content backfill and no changes to historical migrations.
CREATE FUNCTION public.tosker_advance_profile_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER tosker_profile_revision BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tosker_advance_profile_revision();
