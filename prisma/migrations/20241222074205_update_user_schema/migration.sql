/*
  Warnings:

  - You are about to drop the column `profilePicture` on the `Profile` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Like` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Reply` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "profilePicture";

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "fullName" DROP DEFAULT,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "username" DROP DEFAULT;
