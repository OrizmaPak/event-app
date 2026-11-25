DROP INDEX "booking_attendees_seat_uidx";--> statement-breakpoint
CREATE INDEX "booking_attendees_seat_idx" ON "booking_attendees" USING btree ("seat_id");