CREATE TYPE "public"."subroom_visibility" AS ENUM('everyone', 'selected', 'owners');--> statement-breakpoint
CREATE TABLE "subroom_access" (
	"subroom_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subroom_access_subroom_id_user_id_pk" PRIMARY KEY("subroom_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "subrooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid NOT NULL,
	"visibility" "subroom_visibility" DEFAULT 'everyone' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "subroom_id" uuid;--> statement-breakpoint
ALTER TABLE "subroom_access" ADD CONSTRAINT "subroom_access_subroom_id_subrooms_id_fk" FOREIGN KEY ("subroom_id") REFERENCES "public"."subrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subroom_access" ADD CONSTRAINT "subroom_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subrooms" ADD CONSTRAINT "subrooms_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subrooms" ADD CONSTRAINT "subrooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subroom_access_user_idx" ON "subroom_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subrooms_room_idx" ON "subrooms" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subrooms_room_name_unique" ON "subrooms" USING btree ("room_id","name");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_subroom_id_subrooms_id_fk" FOREIGN KEY ("subroom_id") REFERENCES "public"."subrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_subroom_idx" ON "conversations" USING btree ("subroom_id");