-- Refactor RAG + Chat para escopo de tópico (CLAUDE.md §7.1, §8).
-- Denormaliza institution_id/subject_id/topic_id/module_id em Embedding (copiados
-- de File na ingestão; embeddings são imutáveis → sem custo de sincronização) e
-- torna Conversation.topic_id NOT NULL. Ordem importa: ADD nullable → backfill →
-- SET NOT NULL.

-- 1. Colunas denormalizadas NULLABLE
ALTER TABLE "embedding" ADD COLUMN "institution_id" TEXT;
ALTER TABLE "embedding" ADD COLUMN "subject_id" TEXT;
ALTER TABLE "embedding" ADD COLUMN "topic_id" TEXT;
ALTER TABLE "embedding" ADD COLUMN "module_id" TEXT;

-- 2. Backfill a partir de File (institution_id, subject_id, topic_id)
UPDATE "embedding" e
SET institution_id = f.institution_id,
    subject_id     = f.subject_id,
    topic_id       = f.topic_id
FROM "file" f
WHERE e.file_id = f.id;

-- 2b. Backfill module_id via topic (File.topic_id → Topic.module_id)
UPDATE "embedding" e
SET module_id = t.module_id
FROM "file" f
JOIN "topic" t ON t.id = f.topic_id
WHERE e.file_id = f.id;

-- 3. Só então tornar institution_id NOT NULL (subject_id/topic_id/module_id
--    permanecem nullable — refletem File, onde são opcionais)
ALTER TABLE "embedding" ALTER COLUMN "institution_id" SET NOT NULL;

-- 4. Índice de filtro de escopo (btree — complementa o HNSW do vetor)
CREATE INDEX "embedding_institution_id_subject_id_topic_id_idx"
  ON "embedding" ("institution_id", "subject_id", "topic_id");

-- 5. Recriar o índice HNSW do vetor. Foi dropado na migration
--    20260706192754_file_ingestion_error (troca Voyage→Gemini) e nunca recriado.
--    IF NOT EXISTS evita conflito caso já exista em algum ambiente.
CREATE INDEX IF NOT EXISTS "embedding_vector_hnsw_idx"
  ON "embedding" USING hnsw (embedding_vector vector_cosine_ops);

-- 6. Conversation.topic_id NOT NULL.
--    ⚠️ Falha se existirem linhas com topic_id nulo — limpe/backfill antes
--    (ver nota da migration; em cada ambiente é um passo deliberado).
ALTER TABLE "conversation" ALTER COLUMN "topic_id" SET NOT NULL;
