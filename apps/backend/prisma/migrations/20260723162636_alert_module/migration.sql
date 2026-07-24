-- AlterTable
ALTER TABLE "alert" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "resolved_by" TEXT,
ADD COLUMN     "subject_id" TEXT,
ADD COLUMN     "topic_id" TEXT;

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3);

-- Backfill last_activity_at: última mensagem de chat ou último exame concluído.
-- Sem isto, a primeira execução do job diário geraria alertas de inatividade falsos.
UPDATE "student" s SET "last_activity_at" = GREATEST(
  (SELECT MAX(m."created_at") FROM "message" m
     JOIN "conversation" c ON c."id" = m."conversation_id"
    WHERE c."student_id" = s."id"),
  (SELECT MAX(e."completed_at") FROM "exam" e WHERE e."student_id" = s."id")
);

-- CreateIndex
CREATE INDEX "alert_institution_id_resolved_idx" ON "alert"("institution_id", "resolved");

-- CreateIndex
CREATE INDEX "alert_student_id_alert_type_resolved_idx" ON "alert"("student_id", "alert_type", "resolved");
