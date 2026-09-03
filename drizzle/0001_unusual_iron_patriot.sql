ALTER TABLE "conversations" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_sandbox_owner_unique" ON "conversations" USING btree ("owner_id") WHERE "conversations"."kind" = 'sandbox';--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("username");