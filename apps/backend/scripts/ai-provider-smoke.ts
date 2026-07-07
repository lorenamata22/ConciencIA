// Smoke test MANUAL da camada AIProvider — roda contra as APIs reais.
// Não faz parte da suíte Jest nem do CI (fica fora de src/, testRegex não pega).
//
// Uso (com GEMINI_API_KEY preenchida no apps/backend/.env):
//   cd apps/backend && npx ts-node scripts/ai-provider-smoke.ts
//
// Objetivo: confirmar que o formato real das respostas do Gemini
// (texto e embeddings) bate com o que os mocks dos testes unitários assumem.

import * as fs from 'fs';
import * as path from 'path';
import { GeminiAdapter } from '../src/modules/ai-provider/adapters/gemini.adapter';

// Carrega o .env manualmente (dotenv é dependência transitiva — pnpm não expõe)
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, '..', '.env');
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !line.trim().startsWith('#')) env[match[1]] = match[2].trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();

  if (!env.GEMINI_API_KEY) {
    console.error('✗ GEMINI_API_KEY não está preenchida em apps/backend/.env');
    process.exit(1);
  }

  const adapter = new GeminiAdapter({
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || 'gemini-2.5-pro',
    geminiEmbeddingModel: env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  });

  console.log(`Provider: ${adapter.getProviderName()}\n`);

  // 1. complete()
  console.log('── complete() ──');
  const completion = await adapter.complete({
    system: 'Responda em uma única frase curta.',
    messages: [{ role: 'user', content: 'O que é maconha?' }],
    maxTokens: 4096,
  });
  console.log(`content: ${completion.content}`);
  console.log(
    `promptTokens: ${completion.promptTokens} | responseTokens: ${completion.responseTokens}`,
  );
  if (!completion.content || typeof completion.promptTokens !== 'number') {
    throw new Error('complete() não retornou o formato esperado');
  }

  // 2. stream()
  console.log('\n── stream() ──');
  let streamed = '';
  process.stdout.write('chunks: ');
  for await (const chunk of adapter.stream({
    system: 'Responda em uma única frase curta.',
    messages: [{ role: 'user', content: 'Conte até 5.' }],
    maxTokens: 4096,
  })) {
    streamed += chunk;
    process.stdout.write('▪');
  }
  console.log(`\ntexto: ${streamed}`);
  if (!streamed) throw new Error('stream() não produziu chunks');

  // 3. embed() — lote com mais de um texto para validar a ordem dos vetores
  console.log('\n── embed() ──');
  const embedding = await adapter.embed([
    'Texto de teste para embedding.',
    'Segundo texto do lote.',
  ]);
  console.log(
    `model: ${embedding.model} | vetores: ${embedding.vectors.length} | dimensão: ${embedding.vectors[0].length}`,
  );
  if (embedding.vectors.length !== 2) {
    throw new Error(
      `embed() retornou ${embedding.vectors.length} vetores para 2 textos — lote quebrado`,
    );
  }
  if (embedding.vectors[0].length !== 1024) {
    throw new Error(
      `embed() retornou dimensão ${embedding.vectors[0].length} — o schema espera vector(1024)`,
    );
  }

  console.log('\n✓ Smoke test ok — formato real bate com os mocks.');
}

main().catch((error) => {
  console.error('\n✗ Smoke test falhou:', error);
  process.exit(1);
});
