CREATE TYPE "public"."presence_status" AS ENUM('online', 'idle', 'away', 'meeting');--> statement-breakpoint
CREATE TABLE "connection_nicknames" (
	"connection_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connection_nicknames_connection_id_user_id_pk" PRIMARY KEY("connection_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "presence_status" "presence_status" DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_nicknames" ADD CONSTRAINT "connection_nicknames_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_nicknames" ADD CONSTRAINT "connection_nicknames_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;