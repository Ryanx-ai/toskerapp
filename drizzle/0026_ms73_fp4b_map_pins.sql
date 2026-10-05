CREATE TABLE "map_pin_preferences" (
	"pin_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "map_pin_preferences_pin_id_user_id_pk" PRIMARY KEY("pin_id","user_id"),
	CONSTRAINT "map_pin_preferences_revision_valid" CHECK ("map_pin_preferences"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "map_pin_receipts" (
	"conversation_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"result_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "map_pin_receipts_conversation_id_actor_id_request_id_pk" PRIMARY KEY("conversation_id","actor_id","request_id"),
	CONSTRAINT "map_pin_receipts_hash_valid" CHECK (length("map_pin_receipts"."payload_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "map_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"place_key" text NOT NULL,
	"state" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"source" text NOT NULL,
	"provider" text,
	"provider_id" text,
	"address" text DEFAULT '' NOT NULL,
	"attribution" text DEFAULT '' NOT NULL,
	"license" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "map_pins_state_valid" CHECK ("map_pins"."state" in ('favourite','want-to-go','been-here','saved')),
	CONSTRAINT "map_pins_revision_valid" CHECK ("map_pins"."revision" > 0),
	CONSTRAINT "map_pins_coordinates_valid" CHECK ("map_pins"."latitude" between -90 and 90 and "map_pins"."longitude" between -180 and 180),
	CONSTRAINT "map_pins_source_valid" CHECK ("map_pins"."source" in ('search','pin')),
	CONSTRAINT "map_pins_text_valid" CHECK (length("map_pins"."title") between 1 and 120 and length("map_pins"."address") <= 400 and length("map_pins"."attribution") <= 500 and length("map_pins"."license") <= 120 and length("map_pins"."place_key") = 64 and ("map_pins"."provider" is null or length("map_pins"."provider") <= 40) and ("map_pins"."provider_id" is null or length("map_pins"."provider_id") <= 1024))
);
--> statement-breakpoint
ALTER TABLE "map_pin_preferences" ADD CONSTRAINT "map_pin_preferences_pin_id_map_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."map_pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pin_preferences" ADD CONSTRAINT "map_pin_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pin_receipts" ADD CONSTRAINT "map_pin_receipts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pin_receipts" ADD CONSTRAINT "map_pin_receipts_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "map_pin_preferences_user_idx" ON "map_pin_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "map_pins_context_place_unique" ON "map_pins" USING btree ("conversation_id","place_key");--> statement-breakpoint
CREATE INDEX "map_pins_order_idx" ON "map_pins" USING btree ("created_at","id");