# CLAUDE.md — ConciencIA

> Este arquivo contém as instruções operacionais para o agente de desenvolvimento.
> Leia este arquivo integralmente antes de iniciar qualquer tarefa.
> Baseado no PRD_ConciencIA_Final — versão definitiva.

---

## 1. O que é este projeto

ConciencIA é uma plataforma educacional multi-tenant com IA. Instituições cadastram cursos, turmas, professores e alunos. Alunos interagem com um chat inteligente que adapta respostas ao seu perfil cognitivo, usando RAG sobre os materiais das matérias. O sistema também possui modo exame, progresso por tópico, alertas de dificuldade e dashboards para professores e instituições.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js |
| Backend | NestJS |
| ORM | Prisma |
| Banco de dados | PostgreSQL + pgvector |
| Filas | BullMQ / SQS |
| Storage | S3 / Azure Blob |
| IA | Anthropic via MCP |
| Repositório | GitHub — Monorepo |

---

## 3. Estrutura do Monorepo

```
/
├── apps/
│   ├── frontend/        # Next.js
│   └── backend/         # NestJS
└── packages/
    └── shared/          # Types, DTOs e utilitários compartilhados
```

Sempre que criar um tipo ou DTO que será usado nos dois apps, coloque em `packages/shared`.

---

## 4. Padrões de Código

### Linguagem
- Todo código em **inglês**: variáveis, funções, classes, arquivos, rotas, campos do banco
- Comentários em **português**

### Nomenclatura
- Arquivos e pastas: `kebab-case`
- Classes e tipos: `PascalCase`
- Variáveis e funções: `camelCase`
- Campos do banco (Prisma schema): `snake_case`
- Rotas da API: `kebab-case` (ex: `/api/student-metrics`)

### NestJS — Estrutura de Módulos
Um módulo por entidade principal. Estrutura padrão de cada módulo:

```
apps/backend/src/
└── modules/
    └── student/
        ├── student.module.ts
        ├── student.controller.ts
        ├── student.service.ts
        ├── dto/
        │   ├── create-student.dto.ts
        │   └── update-student.dto.ts
        └── entities/
            └── student.entity.ts
```

### Resposta padrão da API

Toda resposta da API deve seguir este formato:

```typescript
{
  data: T,
  message: string,
  statusCode: number
}
```

Use um `ResponseInterceptor` global no NestJS para garantir esse padrão automaticamente.

### Autenticação
- JWT com **access token** (curta duração) + **refresh token** (longa duração)
- Guard global de autenticação — rotas públicas decoradas com `@Public()`
- Payload do JWT deve conter: `userId`, `institutionId`, `userType`
- O `institutionId` do payload é o `tenant_id` usado em todas as queries

---

## 5. Arquitetura Multi-tenant

O banco é **compartilhado** entre todas as instituições. O isolamento é feito por `institution_id`.

### Regras obrigatórias:
- **Toda query** que acessa dados de uma instituição deve incluir `institution_id` no filtro
- O `institution_id` vem **sempre do JWT**, nunca do body da requisição
- Nunca confie em `institution_id` enviado pelo cliente — sempre extraia do token autenticado
- Crie um helper/decorator `@CurrentInstitution()` para extrair o `institution_id` do JWT nos controllers

### Tabelas com `institution_id` direto (topo da hierarquia):
`Institution`, `User`, `Course`, `File`, `Alert`, `AI_Usage`, `Activity`

### Tabelas isoladas por cadeia de JOIN:
- `Class` → via `Course.institution_id`
- `Subject` → via `Course.institution_id`
- `Module` → via `Subject → Course → Institution`
- `Topic` → via `Module → Subject → Course → Institution`
- `Conversation`, `Exam`, `Student` → via `User.institution_id`

---

## 6. Modelo de Dados — Referência Rápida

### Entidades e campos críticos

```
Institution         id, name, status, ai_token_limit, created_at
User                id, institution_id, name, email, password, user_type, ai_token_limit, is_minor, created_at
Student             id, user_id, cognitive_profile, cognitive_test_date, test_count
Teacher             id, user_id
Course              id, institution_id, name, description
Class               id, course_id, name, year, period, license_code
Subject             id, course_id, name, description
Module              id, subject_id, name, order
Topic               id, module_id, title, description, order
Topic_Progress      id, student_id, topic_id, status, total_time, updated_at
File                id, institution_id, subject_id?, topic_id?, name, type, document_type, url, size, is_ai_context, ingestion_status, created_at
Embedding           id, file_id, chunk_text, embedding_vector, metadata, created_at
Conversation        id, student_id, subject_id, topic_id?, created_at
Message             id, conversation_id, role, content, prompt_tokens, response_tokens, created_at
Conversation_Summary  id, conversation_id, summary, created_at
Exam                id, student_id, subject_id, topic_id?, exam_content_json, student_answers_json, final_score, execution_time, result_summary, completed_at
Student_Metrics     id, student_id, subject_id, accuracy_rate, total_time, attempts
Alert               id, student_id, institution_id, alert_type, level, description, resolved, created_at
AI_Usage            id, institution_id, user_id, conversation_id?, provider, model, prompt_tokens, response_tokens, cost, created_at
Note                id, student_id, content, created_at
Favorite            id, student_id, message_id?, file_id?
Activity            id, institution_id, teacher_id, class_id, subject_id?, topic_id?, title, description, start_date, end_date, activity_type, created_at
Student_Activity    id, activity_id, student_id, status, completed_at
GradeTemplate       id, institution_id, name, created_at
GradeColumn         id, template_id, group_name, column_name, grade_type, weight, auto_average
StudentGrade        id, student_id, column_id, value, updated_at
```

### Tabelas de relacionamento N:N
```
Student_Class     student_id, class_id
Teacher_Class     teacher_id, class_id
Teacher_Subject   teacher_id, subject_id
```

### Enums importantes
```
user_type:              student | teacher | institution | super_admin
document_type:          main | supplementary
status (progress):      pending | in_progress | completed
role (message):         user | assistant
ingestion_status:       pending | processing | completed | failed
grade_type:             number | letter | concept | percentage | pass_fail
activity_type:          (livre — definido pelo professor)
```

---

## 7. RAG — Regras Obrigatórias

O RAG é o módulo mais crítico do sistema. Siga estas regras sem exceção:

1. **Isolamento por tenant**: toda query de embedding no pgvector deve incluir `WHERE file.institution_id = $institutionId`. Nunca busque embeddings sem este filtro.

2. **Somente arquivos marcados**: apenas arquivos com `is_ai_context = true` entram no pipeline de ingestão.

3. **Pipeline de ingestão** (executado via fila BullMQ após upload):
   - Upload → extração de texto → chunking (400–800 tokens com overlap) → geração de embedding → inserção em `Embedding` com metadados

4. **Metadados obrigatórios por chunk**: `institution_id`, `file_id`, `subject_id`, `topic_id`, `module_id`, `document_name`

5. **Pipeline de busca** (a cada mensagem do aluno):
   - Gerar embedding da pergunta → buscar top 3–5 chunks por similaridade (filtro por `institution_id`) → incluir chunks no prompt

6. **Re-indexação**: ao substituir um arquivo com `is_ai_context = true`, **deletar todos os embeddings antigos** antes de processar a nova versão. Feito de forma assíncrona via BullMQ.

7. **Fallback**: se não houver contexto suficiente, a IA responde com conhecimento geral e **deve sinalizar isso ao usuário** na resposta.

---

## 8. Chat — Modos e Composição do Prompt

O componente de chat é **único** para ambos os modos. O comportamento muda via prompt de sistema e via histórico enviado.

### Modo Estudo

O aluno seleciona a matéria antes de iniciar. A cada mensagem, o prompt contém:

```
[System]   Prompt do Modo Estudo — assistente educacional, adaptar ao perfil cognitivo
[Context]  Top 3–5 chunks do RAG relevantes (filtro por institution_id + subject_id)
[Profile]  Perfil cognitivo do aluno (Student.cognitive_profile)
[History]  Resumo das últimas 5–10 mensagens (Conversation_Summary)
[User]     Mensagem atual do aluno
```

- Histórico **resumido** (não completo)
- Persistência isolada por matéria

### Modo Exame

O aluno seleciona a matéria **e o tópico** antes de iniciar. O prompt contém:

```
[System]   Prompt do Modo Exame — avaliador, 7 perguntas, não revelar resposta antecipadamente
[Context]  Chunks do RAG do tópico selecionado
[History]  Histórico COMPLETO da conversa (todas perguntas e respostas)
[User]     Resposta atual do aluno
```

- Histórico **completo** enviado a cada requisição (para o modelo não perder o fio)
- Total de 7 perguntas dissertativas
- Ao final, o modelo emite a tag `[EXAM_COMPLETE]` — o backend detecta essa tag para encerrar a sessão, calcular score e persistir o resultado
- O tópico só é marcado como `completed` ao finalizar o exame

### Regras comuns a ambos os modos
- Chat usa **streaming** — SSE (Server-Sent Events) no NestJS
- Verificar limite de tokens antes de qualquer chamada à IA
- Registrar em `AI_Usage` após cada chamada
- Se `User.is_minor = true`, aplicar guardrails mais estritos via prompt de sistema
- Detectar sinais de sofrimento emocional → resposta segura + redirecionamento para adulto de confiança (implementado inteiramente no prompt)

---

## 9. Sistema de Prompts

Cada modo deve ter um prompt de sistema dedicado. Um único prompt genérico não é aceitável.

| Prompt | Finalidade |
|---|---|
| Modo Estudo | Assistente educacional — explicar, guiar, adaptar ao perfil cognitivo, gerar exercícios |
| Modo Exame | Avaliador — fazer perguntas dissertativas, aguardar resposta, corrigir após tentativa, controlar 7 perguntas, emitir `[EXAM_COMPLETE]` |
| Professor (Preparar Aulas) | Sugerir dinâmicas de sala, debates, atividades, avaliações alternativas |
| Resumo de Sessão | Gerar resumo conciso da sessão para salvar em Minhas Anotações |
| Segurança / Distress | Detectar sofrimento emocional, responder com segurança, redirecionar para adulto de confiança |

Cada prompt deve definir: papel da IA, objetivo, tom, contexto disponível, o que a IA pode fazer, o que deve evitar e o formato de saída esperado.

### Prioridade de contexto em toda resposta da IA
1. Material enviado pelo professor (RAG)
2. Tópico/módulo/matéria selecionado e modo atual
3. Perfil cognitivo do aluno (quando aplicável)
4. Progresso/histórico da sessão
5. Conhecimento geral (apenas como fallback, sinalizado ao usuário)

---

## 10. Autenticação e Roles

### Roles e permissões por recurso

| Ação | student | teacher | institution | super_admin |
|---|---|---|---|---|
| Acessar chat | ✅ | ❌ | ❌ | ❌ |
| Upload de materiais | ❌ | ✅ | ✅ | ❌ |
| Gerenciar turmas | ❌ | ❌ | ✅ | ❌ |
| Ver dashboard professor | ❌ | ✅ | ✅ | ❌ |
| Gerenciar instituições | ❌ | ❌ | ❌ | ✅ |
| Cadastrar atividades | ❌ | ✅ | ✅ | ❌ |
| Configurar template de notas | ❌ | ❌ | ✅ | ❌ |
| Preencher notas dos alunos | ❌ | ✅ | ❌ | ❌ |
| Visualizar próprias notas | ✅ | ❌ | ❌ | ❌ |

Use um `RolesGuard` com decorator `@Roles(...)` para controle de acesso por rota.

### Cadastro do aluno
O aluno só pode se cadastrar fornecendo um `license_code` válido. O sistema valida o código, identifica a `Class` correspondente e vincula automaticamente o aluno à instituição e turma — o aluno **nunca seleciona** instituição ou turma manualmente.

---

## 11. Gestão de Tokens de IA

- Antes de cada chamada, verificar se o usuário/instituição ainda tem saldo disponível
- Lógica de limite: se `User.ai_token_limit` não for nulo, usar esse valor; caso contrário, usar `Institution.ai_token_limit`
- Se o limite for atingido, bloquear a chamada e retornar erro claro ao usuário
- Registrar um record em `AI_Usage` após cada chamada com `institution_id`, `user_id`, tokens consumidos e custo
- Nunca deixar uma chamada à IA sem registro em `AI_Usage` — mesmo em caso de erro parcial

---

## 12. Regras de Negócio Inegociáveis

- RAG sempre filtrado por `institution_id` — sem exceção
- Aluno só se cadastra com `license_code` válido
- `institution_id` vem sempre do JWT, nunca do body
- Tópico só marcado como `completed` após o aluno finalizar o exame do tópico (tag `[EXAM_COMPLETE]` detectada)
- Modo Exame: exatamente 7 perguntas dissertativas, histórico completo enviado a cada requisição
- Ao substituir arquivo com `is_ai_context = true`, deletar todos os embeddings antigos antes da re-indexação (async via BullMQ)
- Teste cognitivo limitado a 3 tentativas por ano — verificar `test_count` antes de permitir novo teste
- `Favorite` deve ter exatamente um dos dois campos preenchidos: `message_id` ou `file_id` — validar no DTO
- `Student_Metrics` é agregado por subject — não duplicar com `Topic_Progress`
- Toda chamada à IA deve ser registrada em `AI_Usage`
- A IA não deve revelar a resposta no Modo Exame antes de o aluno tentar responder
- Se `is_minor = true`, guardrails de segurança mais estritos são aplicados via prompt de sistema

---

## 13. Fora de Escopo no MVP

Não implemente os itens abaixo, mesmo que pareçam naturais ou necessários:

- Criteria Mapping / Alinhamento curricular
- Análise de dificuldade do aluno via IA (MVP usa apenas dados do sistema)
- Notificações push ou e-mail
- Pagamentos ou planos de assinatura
- App mobile nativo
- Exportação de relatórios em PDF
- Integração com LMS externos (Moodle, Canvas, etc.)
- Multiidioma na interface (i18n)

---

## 14. Fluxos Críticos por Módulo

### Ingestion Pipeline (RAG)
```
Upload (teacher/institution) → validar is_ai_context
→ SE is_ai_context = true E arquivo já tem embeddings → deletar embeddings antigos (async)
→ enfileirar job BullMQ → extrair texto → chunking (400–800 tokens, overlap)
→ gerar embedding → salvar em Embedding com metadados e institution_id
→ atualizar File.ingestion_status: pending → processing → completed | failed
```

### Chat Modo Estudo
```
Aluno seleciona matéria → extrair institution_id do JWT
→ buscar top 3–5 chunks no pgvector (filtro institution_id + subject_id)
→ buscar cognitive_profile do aluno
→ buscar resumo das últimas 5–10 mensagens (Conversation_Summary)
→ montar prompt Modo Estudo → chamar IA via streaming (SSE)
→ salvar Message → atualizar AI_Usage
```

### Chat Modo Exame
```
Aluno seleciona matéria + tópico → extrair institution_id do JWT
→ buscar chunks do RAG do tópico selecionado
→ buscar histórico COMPLETO da conversa
→ montar prompt Modo Exame (7 perguntas, não revelar resposta) → chamar IA via streaming
→ salvar Message → atualizar AI_Usage
→ SE resposta contém [EXAM_COMPLETE]:
   → calcular final_score → salvar Exam → atualizar Student_Metrics
   → atualizar Topic_Progress.status = 'completed'
```

### Importação via Template .docx
```
Professor faz upload do template .docx preenchido
→ parser extrai estrutura: módulos → tópicos → conteúdo
→ criar registros de Module e Topic na base
→ conteúdo de cada tópico disponível como contexto para a IA
```

### Student Registration
```
Aluno informa license_code → validar código → identificar Class e Institution
→ criar User (institution_id da Class) → criar Student → vincular Student_Class
```

### Grades (Notas)
```
Institution cria GradeTemplate → define grupos, colunas, tipos e pesos
→ Professor acessa tabela já montada → preenche valores (StudentGrade)
→ Médias calculadas automaticamente onde configurado
→ Aluno visualiza suas notas em cards por grupo (somente leitura)
```

### Preparar Aulas (Professor)
```
Professor seleciona Turma > Matéria > Módulo > Tópico(s)
→ sistema monta contexto do tópico selecionado via RAG
→ chama IA com prompt Preparar Aulas → resposta com dicas de dinâmicas
→ abre chat automaticamente com a resposta exibida
→ professor pode continuar a conversa livremente
```

---

## 15. Convenções do Prisma Schema

- Nomes de tabelas em `snake_case` e no **singular** (ex: `institution`, `student`, `topic_progress`)
- Nomes de campos em `snake_case`
- Toda tabela deve ter `id` como `String @id @default(uuid())`
- Timestamps padrão: `created_at DateTime @default(now())` e `updated_at DateTime @updatedAt` onde aplicável

### Campo embedding_vector
```prisma
// Dimensão 1024 — Voyage AI
embedding_vector Unsupported("vector(1024)")
```

### Índice obrigatório para RAG (HNSW)
```prisma
model Embedding {
  id               String   @id @default(uuid())
  file_id          String
  chunk_text       String
  embedding_vector Unsupported("vector(1024)")
  metadata         Json
  created_at       DateTime @default(now())

  file File @relation(fields: [file_id], references: [id])

  @@index([file_id])
  // Índice HNSW criado via migration raw SQL — não remover:
  // CREATE INDEX ON embedding USING hnsw (embedding_vector vector_cosine_ops);
}
```

O índice HNSW **não pode ser declarado no schema Prisma** — deve ser criado via migration com SQL raw:
```sql
CREATE INDEX ON embedding USING hnsw (embedding_vector vector_cosine_ops);
```

### Índices obrigatórios de performance
```prisma
@@index([institution_id])
```
Tabelas obrigatórias: `user`, `course`, `file`, `alert`, `ai_usage`, `activity`

### Extensão pgvector
A migration inicial deve habilitar a extensão:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 16. Variáveis de Ambiente

O arquivo `.env.example` deve existir na raiz do monorepo. Nunca hardcode valores de configuração no código.

```env
# ── Banco de dados ──────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/conciencia

# ── JWT ─────────────────────────────────────────────
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

# ── Anthropic ───────────────────────────────────────
ANTHROPIC_API_KEY=
AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# ── Voyage AI (embeddings) ──────────────────────────
VOYAGE_API_KEY=
VOYAGE_EMBEDDING_MODEL=voyage-3

# ── Storage ─────────────────────────────────────────
STORAGE_PROVIDER=s3                  # s3 | azure
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=

# ── Filas ───────────────────────────────────────────
REDIS_URL=redis://localhost:6379
QUEUE_INGESTION=rag-ingestion

# ── App ─────────────────────────────────────────────
NODE_ENV=development
BACKEND_PORT=3001
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Use `@nestjs/config` com `ConfigService` tipado no NestJS. Nunca acesse `process.env` diretamente nos serviços.

---

## 17. Tratamento de Erros

### Padrão de resposta de erro
```typescript
{
  data: null,
  message: "Descrição do erro",
  statusCode: 400
}
```

Use um `GlobalExceptionFilter` no NestJS para garantir esse formato em qualquer erro não tratado.

### Erros esperados por fluxo crítico

| Fluxo | Erro | Código |
|---|---|---|
| Login | Credenciais inválidas | 401 |
| Cadastro aluno | License code inválido ou expirado | 400 |
| Chat | Limite de tokens atingido | 403 |
| Upload | Tipo de arquivo não suportado | 400 |
| Teste cognitivo | Limite de 3 tentativas atingido | 403 |
| Qualquer rota | Recurso não pertence ao tenant | 403 |
| Qualquer rota | Token JWT expirado | 401 |

Se uma query retornar dados de um `institution_id` diferente do JWT, lançar `ForbiddenException` imediatamente — nunca retornar dados de outro tenant silenciosamente.

---

## 18. Camada de Abstração de IA (AI Provider Layer)

Nenhum módulo fora de `ai-provider` deve importar ou referenciar diretamente o SDK da Anthropic. Todo acesso à IA passa obrigatoriamente pela interface `AIProvider`.

```typescript
// packages/shared/src/ai/ai-provider.interface.ts

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  stream(options: AICompletionOptions): AsyncIterable<string>;
  embed(text: string): Promise<AIEmbeddingResult>;
  getProviderName(): string;
}
```

O provider ativo é definido pela variável de ambiente `AI_PROVIDER`. Para adicionar um novo provider: criar o adapter, registrar no `AIProviderService`, adicionar variáveis de ambiente. Nenhum outro arquivo precisa ser alterado.

---

## 19. Gestão de Filas BullMQ

Nunca processe embeddings de forma síncrona durante o upload — isso travaria a requisição.

```
POST /files (upload) → salvar arquivo no storage → salvar File no banco
→ SE is_ai_context = true → enfileirar job em 'rag-ingestion'
→ retornar resposta imediata ao cliente
```

### Payload do job
```typescript
interface RagIngestionJob {
  fileId: string;
  institutionId: string;
  fileUrl: string;
  fileName: string;
  replaceExisting: boolean; // true quando é substituição de arquivo
}
```

### Tratamento de falha
- Configure `attempts: 3` e `backoff: { type: 'exponential', delay: 5000 }`
- Em caso de falha, atualizar `File.ingestion_status = 'failed'` e logar o erro

---

## 20. Convenções do Next.js (App Router)

### Estrutura de pastas
```
apps/frontend/
├── app/
│   ├── (auth)/              # Rotas públicas: login, cadastro
│   ├── (dashboard)/         # Rotas protegidas por role
│   │   ├── student/
│   │   ├── teacher/
│   │   ├── institution/
│   │   └── admin/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  # Componentes genéricos
│   └── modules/             # Componentes por módulo (ChatWindow, etc.)
├── lib/
│   ├── api/                 # Funções de chamada à API (fetch wrappers)
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utilitários gerais
└── middleware.ts             # Proteção de rotas por role
```

- Todas as chamadas à API ficam em `lib/api/`, um arquivo por módulo
- Use `fetch` nativo com `NEXT_PUBLIC_API_URL` como base
- Prefira **Server Components** por padrão; use `"use client"` apenas quando necessário
- O componente de chat é obrigatoriamente Client Component (streaming via SSE)
- Use `middleware.ts` para redirecionar usuários sem autenticação ou com role incorreta

---

## 21. Metodologia de Desenvolvimento — TDD

O desenvolvimento segue **Test-Driven Development (TDD)**. Ordem obrigatória:

```
1. Escrever o teste → 2. Confirmar que falha (Red) → 3. Escrever o código mínimo → 4. Confirmar que passa (Green) → 5. Refatorar se necessário (Refactor)
```

### Stack de testes

| Camada | Ferramenta |
|---|---|
| Backend (unit + integration) | Jest + Supertest |
| Frontend (componentes) | Jest + React Testing Library |
| E2E | Playwright |

### Cobertura mínima esperada
- Services: **80%** de cobertura de linhas
- Fluxos críticos: **100%** cobertos por testes e2e

### Mocks obrigatórios nos testes unitários
- **Prisma**: `jest-mock-extended`
- **AIProvider**: mockar a interface — nunca chamar a API real em testes
- **BullMQ**: mockar o producer
- **Storage (S3/Azure)**: mockar o client

### Convenção de nomenclatura dos testes
```typescript
it('should throw BadRequestException when license_code is invalid')
it('should return top 5 chunks filtered by institution_id')
it('should block AI call when token limit is reached')
it('should mark topic as completed after exam is finished')
it('should delete old embeddings before re-indexing replaced file')
```

---

## 22. CI/CD

### Estratégia de branches

| Branch | Comportamento |
|---|---|
| `feature/*` | Apenas CI (lint, testes, build) |
| `staging` | CI + deploy automático para staging |
| `main` | CI + deploy automático para produção |

PR só pode ser mergeado se todos os jobs do CI passarem.

### CI — jobs

```
lint ──────────────────────────────────────────┐
typecheck ─────────────────────────────────────┤
test-backend (unit) ───────────────────────────┤──→ build
test-frontend (unit) ──────────────────────────┤
test-e2e ──────────────────────────────────────┘
```

- **test-backend**: sobe PostgreSQL + pgvector, roda migrations, executa Jest, verifica cobertura mínima de 80%
- **test-e2e**: fluxos obrigatórios — cadastro com license code, chat modo estudo, chat modo exame (incluindo detecção de `[EXAM_COMPLETE]`), upload + RAG ingestion, re-indexação ao substituir arquivo, topic completion

### Serviço PostgreSQL no GitHub Actions
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: conciencia_test
```

**Regra:** nunca chamar APIs externas reais (Anthropic, Voyage AI, S3) no CI — sempre usar mocks.

---

## 23. Sistema de Tema — Cor Primária por Perfil

O frontend usa uma variável CSS global `--color-primary` que muda conforme o perfil/role do usuário. Toda a UI deve consumir essa variável em vez de cores hardcoded.

### Variáveis CSS disponíveis

Definidas em `app/globals.css` dentro do bloco `@theme` (Tailwind v4):

```css
--color-primary        /* cor principal do perfil */
--color-primary-hover  /* versão escurecida para estados hover */
--color-primary-text   /* cor do texto sobre fundo primário */
```

### Classes Tailwind geradas

Por estarem no `@theme`, o Tailwind gera automaticamente:

```
bg-primary          text-primary          border-primary
bg-primary-hover    text-primary-hover    border-primary-hover
bg-primary-text     text-primary-text
hover:bg-primary    hover:bg-primary-hover
bg-primary/20       (com opacidade)
```

**Nunca use `bg-brand-teal` em elementos que devem respeitar o tema do perfil.** Use `bg-primary`.

### Valores por perfil

| Perfil | `--color-primary` | `--color-primary-hover` | `--color-primary-text` |
|---|---|---|---|
| `student` | `#85C9C3` | `#6BB5AF` | `#ffffff` |
| `teacher` | `#C9C8EC` | `#B5B4E0` | `#ffffff` |
| `admin` | `#ECECEC` | `#D8D8D8` | `#5F5E5C` |

### Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| `app/globals.css` | Declara as variáveis no `@theme` com valores padrão |
| `app/providers/theme-provider.tsx` | Context + `setProfile()` que aplica as vars no `:root` e persiste no `localStorage` |
| `app/layout.tsx` | Envolve toda a aplicação com `ThemeProvider` |

### Como consumir em componentes

```tsx
// Botão padrão que respeita o tema
className="bg-primary hover:bg-primary-hover text-primary-text"

// Texto colorido
className="text-primary"

// Borda
className="border-primary focus:ring-primary/20"
```

### Como alterar o tema programaticamente

```tsx
const { setProfile } = useTheme();
setProfile('teacher'); // atualiza CSS vars + localStorage
```

### Mapeamento userType (JWT) → perfil

Feito no `WelcomeScreen` após login bem-sucedido:

| `userType` | Perfil aplicado |
|---|---|
| `student` | `student` |
| `teacher` | `teacher` |
| `institution` | `admin` |
| `super_admin` | `admin` |

O tema definido na tela de seleção de perfil (`/`) é **sobrescrito pelo role real do JWT** na tela de boas-vindas (`/welcome`). Isso garante consistência mesmo que o usuário tenha clicado no perfil errado.

---

## 24. Princípio Geral de Desenvolvimento

> **Evitar overengineering é uma regra de negócio, não uma sugestão.**

Para o MVP, sempre preferir a solução mais simples que resolve o problema. Complexidade adicional só quando realmente necessária e justificada. O sistema foi desenhado para evoluir — decisões de simplicidade no MVP são intencionais.
