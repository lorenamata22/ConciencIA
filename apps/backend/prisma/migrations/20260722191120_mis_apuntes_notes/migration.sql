/*
  Warnings:

  - Added the required column `subject_id` to the `note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic_id` to the `note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `note` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_topic_id_fkey";

-- DropIndex
DROP INDEX "embedding_vector_hnsw_idx";

-- AlterTable
ALTER TABLE "note" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "source_message_id" TEXT,
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "topic_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "note_student_id_idx" ON "note"("student_id");

-- CreateIndex
CREATE INDEX "note_student_id_subject_id_idx" ON "note"("student_id", "subject_id");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
