ALTER TABLE "payments" ALTER COLUMN "gateway" SET DEFAULT 'RAZORPAY';
UPDATE "payment_gateway_configs"
SET "is_enabled" = false, "is_primary" = false, "traffic_weight" = 0
WHERE "gateway" = 'PHONEPE';
