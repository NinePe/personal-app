#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# personal-app — Production Deploy Script
# Usage:
#   ./scripts/deploy.sh               # Full stack
#   ./scripts/deploy.sh --backend-only # Backend only
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

BACKEND_ONLY=false
if [ "${1:-}" = "--backend-only" ]; then
    BACKEND_ONLY=true
    info "Mode: backend-only (clones from GitHub: NinePe/personal-app)"
fi

# ── Step 1: Check dependencies ────────────────────────────────
info "Checking dependencies..."

if ! command -v docker &> /dev/null; then
    error "Docker is not installed."
    echo "Install: https://docs.docker.com/engine/install/"
    exit 1
fi
ok "Docker: $(docker --version)"

if ! docker compose version &> /dev/null; then
    error "Docker Compose plugin not found."
    exit 1
fi
ok "Docker Compose: $(docker compose version)"

# ── Step 2: Check .env file ───────────────────────────────────
if [ ! -f .env ]; then
    warn ".env file not found!"
    if [ -f .env.production.example ]; then
        info "Creating .env from .env.production.example..."
        cp .env.production.example .env
        error ">>>>> EDIT .env WITH YOUR PRODUCTION VALUES <<<<<"
        error "Then run this script again."
        exit 1
    else
        error "No .env.production.example found."
        exit 1
    fi
fi
ok ".env file exists"

# ── Step 3: Build images ──────────────────────────────────────
if $BACKEND_ONLY; then
    info "Building backend image (clones from GitHub)..."
    docker compose build --no-cache backend
else
    info "Building all images..."
    docker compose build --no-cache
fi
ok "Images built successfully"

# ── Step 4: Start services ────────────────────────────────────
docker compose down --remove-orphans 2>/dev/null || true

if $BACKEND_ONLY; then
    info "Starting backend service..."
    docker compose up -d backend
else
    info "Starting all services..."
    docker compose up -d
fi
ok "Services started"

# ── Step 5: Wait for healthy ──────────────────────────────────
info "Waiting for services to be healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    BACKEND_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' personal-app-backend 2>/dev/null || echo "unknown")

    if $BACKEND_ONLY; then
        if [ "$BACKEND_HEALTHY" = "healthy" ]; then
            ok "Backend is healthy!"
            break
        fi
        info "Waiting... (${ATTEMPTS}/${MAX_ATTEMPTS}) — backend: ${BACKEND_HEALTHY}"
    else
        FRONTEND_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' personal-app-frontend 2>/dev/null || echo "unknown")
        if [ "$BACKEND_HEALTHY" = "healthy" ] && [ "$FRONTEND_HEALTHY" = "healthy" ]; then
            ok "Both services are healthy!"
            break
        fi
        info "Waiting... (${ATTEMPTS}/${MAX_ATTEMPTS}) — backend: ${BACKEND_HEALTHY}, frontend: ${FRONTEND_HEALTHY}"
    fi

    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 2
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    error "Services did not become healthy in time. Check logs:"
    docker compose logs --tail=50
    exit 1
fi

# ── Step 6: Show status ───────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOY COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Backend:   ${CYAN}http://localhost:4010${NC}"
echo -e "  Health:    ${CYAN}http://localhost:4010/health${NC}"
if ! $BACKEND_ONLY; then
    echo -e "  Frontend:  ${CYAN}http://localhost:3010${NC}"
fi
echo ""
echo -e "  Show logs: ${YELLOW}docker compose logs -f${NC}"
echo -e "  Stop:      ${YELLOW}docker compose down${NC}"
echo -e "  Restart:   ${YELLOW}docker compose restart${NC}"
echo ""
