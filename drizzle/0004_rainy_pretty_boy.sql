DROP INDEX "check_ins_attendee_uidx";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "management_token_hash" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "idempotency_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "platform_fee_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "operation_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "reversed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "reversed_by" text;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "reversal_reason" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "platform_fee_bps" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "payout_delay_days" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_uidx" ON "bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_attendee_active_uidx" ON "check_ins" USING btree ("booking_attendee_id") WHERE "check_ins"."reversed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_operation_uidx" ON "check_ins" USING btree ("operation_id");