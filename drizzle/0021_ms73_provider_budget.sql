CREATE TABLE "map_provider_usage" (
	"scope" text PRIMARY KEY NOT NULL,
	"window" text NOT NULL,
	"used" integer NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL
);
