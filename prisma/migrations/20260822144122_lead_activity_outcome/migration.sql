-- CreateEnum
CREATE TYPE "ActivityOutcome" AS ENUM ('RESPONDED', 'NOT_RESPONDED', 'SCHEDULED', 'NOT_INTERESTED', 'NO_ANSWER');

-- AlterTable
ALTER TABLE "LeadActivity" ADD COLUMN     "outcome" "ActivityOutcome";
