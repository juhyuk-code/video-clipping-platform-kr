-- Remove deprecated BOTH role from UserRole enum.
-- Existing BOTH users are reassigned to CREATOR.

UPDATE "User"
SET "role" = 'CREATOR'
WHERE "role" = 'BOTH';

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'CLIPPER', 'ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIPPER';

DROP TYPE "UserRole_old";
