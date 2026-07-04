-- DropForeignKey
ALTER TABLE "grade_column" DROP CONSTRAINT "grade_column_template_id_fkey";

-- DropForeignKey
ALTER TABLE "grade_template" DROP CONSTRAINT "grade_template_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "student_grade" DROP CONSTRAINT "student_grade_column_id_fkey";

-- DropForeignKey
ALTER TABLE "student_grade" DROP CONSTRAINT "student_grade_student_id_fkey";

-- NOTA: o índice HNSW "embedding_vector_hnsw_idx" é criado via SQL raw e não
-- é declarado no schema Prisma (ver CLAUDE.md §15). Não deve ser dropado aqui.

-- DropTable
DROP TABLE "grade_column";

-- DropTable
DROP TABLE "grade_template";

-- DropTable
DROP TABLE "student_grade";

-- DropEnum
DROP TYPE "GradeType";

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_class" (
    "task_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "task_class_pkey" PRIMARY KEY ("task_id","class_id")
);

-- CreateTable
CREATE TABLE "task_grade" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_institution_id_idx" ON "task"("institution_id");

-- CreateIndex
CREATE INDEX "task_teacher_id_idx" ON "task"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_grade_task_id_student_id_key" ON "task_grade"("task_id", "student_id");

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_class" ADD CONSTRAINT "task_class_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_class" ADD CONSTRAINT "task_class_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_grade" ADD CONSTRAINT "task_grade_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_grade" ADD CONSTRAINT "task_grade_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

