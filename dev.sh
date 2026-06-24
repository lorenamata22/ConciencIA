#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }
err() { echo -e "${RED}[dev]${NC} $1"; }

# Encerra todos os processos ao Ctrl+C
cleanup() {
  echo ""
  warn "Encerrando processos..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Subir infraestrutura
log "Subindo PostgreSQL e Redis..."
docker compose up -d

# 2. Aguardar PostgreSQL estar pronto
warn "Aguardando PostgreSQL..."
until docker exec conciencia_postgres pg_isready -U conciencia -d conciencia_dev > /dev/null 2>&1; do
  sleep 1
done
log "PostgreSQL pronto."

# 3. Aplicar migrations pendentes
log "Aplicando migrations..."
(cd apps/backend && pnpm prisma migrate deploy)
log "Migrations ok."

# 4. Iniciar backend
log "Iniciando backend (NestJS)..."
(cd apps/backend && pnpm start:dev) &
BACKEND_PID=$!

# 5. Iniciar frontend
log "Iniciando frontend (Next.js)..."
(cd apps/frontend && npm run dev) &
FRONTEND_PID=$!

log "Ambiente pronto."
log "  Backend:  http://localhost:3001"
log "  Frontend: http://localhost:3000"
warn "Pressione Ctrl+C para encerrar tudo."

# Aguarda ambos os processos
wait $BACKEND_PID $FRONTEND_PID
