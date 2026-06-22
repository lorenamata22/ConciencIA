-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('teacher', 'student');

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_class_id_fkey";

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "student_activity" DROP CONSTRAINT "student_activity_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "student_activity" DROP CONSTRAINT "student_activity_student_id_fkey";


-- DropTable
DROP TABLE "activity";

-- DropTable
DROP TABLE "student_activity";

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "audience_type" "AudienceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT 'general',
    "subject_id" TEXT,
    "topic_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_class" (
    "event_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "event_class_pkey" PRIMARY KEY ("event_id","class_id")
);

-- CreateIndex
CREATE INDEX "event_institution_id_idx" ON "event"("institution_id");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_class" ADD CONSTRAINT "event_class_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_class" ADD CONSTRAINT "event_class_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

