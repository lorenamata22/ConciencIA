-- DropIndex
DROP INDEX "embedding_vector_hnsw_idx";

-- AlterTable
ALTER TABLE "file" ADD COLUMN     "ingestion_error" TEXT;
