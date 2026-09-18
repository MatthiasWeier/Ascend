-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LBS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG';
