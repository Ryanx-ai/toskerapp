CREATE TYPE "public"."identity_banner" AS ENUM('glow', 'weave', 'plain');--> statement-breakpoint
CREATE TYPE "public"."identity_frame" AS ENUM('none', 'ring');--> statement-breakpoint
CREATE TYPE "public"."interface_accent" AS ENUM('tosker', 'iris', 'tide');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "identity_banner" "identity_banner" DEFAULT 'glow' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "identity_frame" "identity_frame" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "interface_accent" "interface_accent" DEFAULT 'tosker' NOT NULL;