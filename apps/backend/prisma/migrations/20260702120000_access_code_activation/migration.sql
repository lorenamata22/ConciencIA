-- Pré-cadastro com ativação: senha nula = conta pendente; access_code é o token de ativação
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN "access_code" TEXT;
ALTER TABLE "user" ADD COLUMN "birth_date" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_access_code_key" ON "user"("access_code");
