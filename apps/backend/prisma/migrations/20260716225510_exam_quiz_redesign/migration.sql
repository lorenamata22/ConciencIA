/*
  Warnings:

  - Made the column `topic_id` on table `exam` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('main', 'retry');

-- DropForeignKey
ALTER TABLE "exam" DROP CONSTRAINT "exam_topic_id_fkey";

-- Exames do fluxo conversacional antigo sem tópico não são migráveis para o
-- novo desenho (topic_id NOT NULL) — remoção defensiva antes do SET NOT NULL
DELETE FROM "exam" WHERE "topic_id" IS NULL;

-- AlterTable
ALTER TABLE "exam" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "exam_type" "ExamType" NOT NULL DEFAULT 'main',
ALTER COLUMN "topic_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "exam_student_id_topic_id_idx" ON "exam"("student_id", "topic_id");

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
