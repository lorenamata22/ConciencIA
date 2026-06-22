-- AlterTable
ALTER TABLE "public"."institution" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "representative_name" TEXT;

-- CreateTable
CREATE TABLE "public"."period_option" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "period_option_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "period_option_institution_id_idx" ON "public"."period_option"("institution_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."period_option" ADD CONSTRAINT "period_option_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

