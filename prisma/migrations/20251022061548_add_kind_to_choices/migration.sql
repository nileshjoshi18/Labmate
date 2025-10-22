/*
  Warnings:

  - Added the required column `userId` to the `Choices` table without a default value. This is not possible if the table is not empty.
  - Made the column `subject` on table `Choices` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."SubjectKind" AS ENUM ('LECTURE', 'LAB');

-- AlterTable
ALTER TABLE "public"."Choices" ADD COLUMN     "kind" "public"."SubjectKind" NOT NULL DEFAULT 'LECTURE',
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "subject" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Choices" ADD CONSTRAINT "Choices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
