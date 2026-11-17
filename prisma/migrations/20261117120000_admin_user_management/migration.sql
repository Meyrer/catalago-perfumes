ALTER TABLE "AdminUser"
    ADD COLUMN "email" TEXT,
    ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "resetTokenHash" TEXT,
    ADD COLUMN "resetExpiresAt" TIMESTAMP(3);
