ALTER TABLE "users" ADD COLUMN "date_of_birth" DATE, ADD COLUMN "gender" TEXT, ADD COLUMN "state" TEXT, ADD COLUMN "personal_phone" TEXT, ADD COLUMN "contact_email" TEXT;
ALTER TABLE "seat_holds" ADD COLUMN "passenger_context" JSONB;
ALTER TABLE "bookings" ADD COLUMN "passenger_context" JSONB;
CREATE TABLE "saved_passengers" (
 "id" UUID NOT NULL, "user_id" UUID NOT NULL, "name" VARCHAR(100) NOT NULL,
 "date_of_birth" DATE, "age" INTEGER, "age_recorded_on" DATE, "gender" VARCHAR(1) NOT NULL,
 "mobile" VARCHAR(10), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "saved_passengers_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "saved_passengers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "saved_passengers_gender_check" CHECK ("gender" IN ('M','F','O')),
 CONSTRAINT "saved_passengers_age_check" CHECK ("age" IS NULL OR "age" BETWEEN 1 AND 120),
 CONSTRAINT "saved_passengers_birth_or_age_check" CHECK ("date_of_birth" IS NOT NULL OR ("age" IS NOT NULL AND "age_recorded_on" IS NOT NULL))
);
CREATE INDEX "saved_passengers_user_id_created_at_id_idx" ON "saved_passengers"("user_id", "created_at", "id");
