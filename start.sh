#!/usr/bin/env bash

# Konstruxio AI — Full Stack Startup Script
# Starts Docker services (PostgreSQL, Ollama, Media-AI), backend (Spring Boot), and frontend (Vite React).

set -eo pipefail

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BOLD}${CYAN}====================================================${NC}"
echo -e "${BOLD}${CYAN}        Konstruxio AI — Environment Startup        ${NC}"
echo -e "${BOLD}${CYAN}====================================================${NC}"

# Parse optional arguments
SKIP_DOCKER=false
INFRA_ONLY=false
PULL_MODELS=false

for arg in "$@"; do
  case "$arg" in
    --no-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --infra-only)
      INFRA_ONLY=true
      shift
      ;;
    --pull-models)
      PULL_MODELS=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./start.sh [options]"
      echo ""
      echo "Options:"
      echo "  --no-docker     Skip starting Docker containers"
      echo "  --infra-only    Start Docker containers only (PostgreSQL, Ollama, Media-AI)"
      echo "  --pull-models   Pull Ollama models (llama3.2:3b, nomic-embed-text)"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
  esac
done

# Step 1: Environment file check
echo -e "\n${BOLD}${BLUE}[1/5] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file.${NC}"
  else
    echo -e "${RED}❌ Neither .env nor .env.example was found.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ .env file found.${NC}"
fi

# Load environment variables into current shell
set -a
# shellcheck disable=SC1091
source .env
set +a

# Step 2: Docker Infrastructure
if [ "$SKIP_DOCKER" = false ]; then
  echo -e "\n${BOLD}${BLUE}[2/5] Starting Docker infrastructure (PostgreSQL, Ollama, Media-AI)...${NC}"

  # Detect Docker Compose command
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
  else
    echo -e "${RED}❌ Neither 'docker compose' nor 'docker-compose' was found. Please install Docker.${NC}"
    exit 1
  fi

  # Start containers (with auto-recovery for stale container conflicts)
  if ! $DOCKER_COMPOSE up -d postgres ollama media-ai; then
    echo -e "${YELLOW}⚠️  Container startup failed (likely name conflict). Cleaning up stale containers...${NC}"
    docker rm -f konstruxio-postgres konstruxio-ollama konstruxio-media-ai 2>/dev/null || true
    echo -e "${CYAN}Retrying Docker startup...${NC}"
    $DOCKER_COMPOSE up -d postgres ollama media-ai
  fi

  # Wait for PostgreSQL to become ready
  echo -e "${CYAN}Waiting for PostgreSQL database to be ready...${NC}"
  MAX_RETRIES=30
  RETRY_COUNT=0
  until docker exec konstruxio-postgres pg_isready -U "${POSTGRES_USER:-konstruxio}" -d "${POSTGRES_DB:-konstruxio}" >/dev/null 2>&1 || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
  done
  echo ""

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo -e "${YELLOW}⚠️  PostgreSQL is taking longer than usual to report ready. Proceeding anyway...${NC}"
  else
    echo -e "${GREEN}✓ PostgreSQL is ready.${NC}"
  fi

  # Optionally pull Ollama models
  if [ "$PULL_MODELS" = true ]; then
    echo -e "${CYAN}Pulling Ollama models...${NC}"
    docker exec -it konstruxio-ollama ollama pull "${OLLAMA_MODEL:-llama3.2:3b}" || true
    docker exec -it konstruxio-ollama ollama pull "${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}" || true
    echo -e "${GREEN}✓ Ollama models ready.${NC}"
  fi
else
  echo -e "\n${BOLD}${BLUE}[2/5] Skipping Docker infrastructure (--no-docker specified).${NC}"
fi

if [ "$INFRA_ONLY" = true ]; then
  echo -e "\n${BOLD}${GREEN}✓ Infrastructure started successfully (--infra-only specified).${NC}"
  exit 0
fi

# Step 3: Frontend dependency check
echo -e "\n${BOLD}${BLUE}[3/5] Checking frontend dependencies...${NC}"
if [ ! -d "frontend/node_modules" ]; then
  echo -e "${YELLOW}Installing frontend npm dependencies...${NC}"
  (cd frontend && npm install)
  echo -e "${GREEN}✓ Frontend dependencies installed.${NC}"
else
  echo -e "${GREEN}✓ Frontend node_modules found.${NC}"
fi

# Step 4: Tool verification (Maven & Node)
echo -e "\n${BOLD}${BLUE}[4/5] Verifying build tools...${NC}"
if ! command -v mvn >/dev/null 2>&1 && [ ! -f "backend/mvnw" ]; then
  echo -e "${RED}❌ Maven (mvn) or wrapper (mvnw) is required to run the backend.${NC}"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}❌ Node.js and npm are required to run the frontend.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build tools verified.${NC}"

# Step 5: Launch Backend and Frontend
echo -e "\n${BOLD}${BLUE}[5/5] Launching Backend & Frontend services...${NC}"

BACKEND_CMD="mvn spring-boot:run"
if [ -f "backend/mvnw" ]; then
  BACKEND_CMD="./mvnw spring-boot:run"
fi

# Process cleanup handler
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Stopping frontend (PID $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  echo -e "${GREEN}✓ All services stopped. Note: Docker containers remain running.${NC}"
  echo -e "To stop Docker containers, run: ${CYAN}docker compose down${NC}"
  exit 0
}

trap cleanup INT TERM EXIT

# Start Backend
echo -e "${CYAN}Starting Spring Boot Backend on http://localhost:8080...${NC}"
(
  cd backend
  $BACKEND_CMD
) &
BACKEND_PID=$!

# Start Frontend
echo -e "${CYAN}Starting Vite Frontend on http://localhost:5173...${NC}"
(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

echo -e "\n${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}${GREEN}          Konstruxio AI is running!                 ${NC}"
echo -e "${BOLD}${GREEN}====================================================${NC}"
echo -e "  🌐 ${BOLD}Frontend:${NC}     http://localhost:5173"
echo -e "  ⚙️  ${BOLD}Backend API:${NC}  http://localhost:8080"
echo -e "  🩺 ${BOLD}Healthcheck:${NC}  http://localhost:8080/actuator/health"
echo -e "  🧠 ${BOLD}Media AI:${NC}     http://localhost:8090"
echo -e "  🦙 ${BOLD}Ollama:${NC}       http://localhost:11434"
echo -e "===================================================="
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}\n"

# Keep script running and wait for both child processes
wait "$BACKEND_PID" "$FRONTEND_PID"
