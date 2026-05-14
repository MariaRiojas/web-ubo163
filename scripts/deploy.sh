#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
# Deploy automatizado de CUARTEL-ERP a AWS
# ════════════════════════════════════════════════════════════
#
# Uso:
#   ./scripts/deploy.sh [--skip-build] [--skip-migrations] [--only-stack <nombre>]
#
# Variables de entorno requeridas:
#   AWS_PROFILE (opcional)    — perfil AWS a usar
#   AWS_REGION=us-east-1      — región de despliegue
#
# Equivalente a scripts/deploy.ps1 para entornos Linux/macOS/CI.
# ════════════════════════════════════════════════════════════

set -euo pipefail

SKIP_BUILD=0
SKIP_MIGRATIONS=0
ONLY_STACK=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-migrations) SKIP_MIGRATIONS=1; shift ;;
    --only-stack) ONLY_STACK="$2"; shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${CYAN}━━━ $1${NC}"; }
ok()   { echo -e "   ${GREEN}✓${NC} $1"; }
warn() { echo -e "   ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "   ${RED}✗${NC} $1" >&2; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_ACCOUNT="607520774564"

# ───────────────────────────────────────────────
# Validación
# ───────────────────────────────────────────────

step "Validando prerrequisitos"

for tool in node npm aws cdk; do
  if ! command -v "$tool" > /dev/null; then
    err "$tool no encontrado"
    exit 1
  fi
done
ok "Herramientas disponibles"

caller=$(aws sts get-caller-identity --output json)
account=$(echo "$caller" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4)

if [[ "$account" != "$EXPECTED_ACCOUNT" ]]; then
  err "Cuenta AWS incorrecta: $account. Se esperaba $EXPECTED_ACCOUNT."
  exit 1
fi
ok "AWS account: $account"

# ───────────────────────────────────────────────
# Build Next.js
# ───────────────────────────────────────────────

cd "$PROJECT_ROOT"

if [[ $SKIP_BUILD -eq 0 ]]; then
  step "Validando TypeScript del proyecto"
  npx tsc --noEmit
  ok "TypeScript limpio"

  step "Construyendo Next.js (standalone)"
  NODE_OPTIONS="--max-old-space-size=4096" npm run build
  ok "Build completado"
else
  warn "Skip build"
fi

# ───────────────────────────────────────────────
# CDK synth
# ───────────────────────────────────────────────

cd "$PROJECT_ROOT/infra/cdk"

step "Validando TypeScript del CDK"
npx tsc --noEmit
ok "CDK TypeScript limpio"

step "Sintetizando stacks"
npx cdk synth --quiet
ok "Stacks sintetizados"

# ───────────────────────────────────────────────
# Deploy
# ───────────────────────────────────────────────

if [[ -n "$ONLY_STACK" ]]; then
  step "Desplegando stack único: $ONLY_STACK"
  npx cdk deploy "$ONLY_STACK" --require-approval never
  ok "$ONLY_STACK desplegado"
else
  STACKS=(
    "cuartel-secrets"
    "cuartel-network"
    "cuartel-storage"
    "cuartel-database"
    "cuartel-scraper"
    "cuartel-app"
    "cuartel-observability"
  )

  step "Desplegando stacks en orden"
  for stack in "${STACKS[@]}"; do
    echo "   → $stack"
    npx cdk deploy "$stack" --require-approval never --progress events
  done
  ok "Todos los stacks desplegados"
fi

# ───────────────────────────────────────────────
# Post-deploy
# ───────────────────────────────────────────────

cd "$PROJECT_ROOT"

if [[ $SKIP_MIGRATIONS -eq 0 ]]; then
  step "Aplicando migraciones Drizzle"

  if secret=$(aws secretsmanager get-secret-value \
      --secret-id cuartel-erp/db-url \
      --query SecretString \
      --output text 2>/dev/null); then
    export DATABASE_URL="$secret"
    if npm run db:push; then
      ok "Migraciones aplicadas"
    else
      warn "db:push retornó error — revisar manualmente"
    fi
  else
    warn "No se encontró secret cuartel-erp/db-url"
  fi
fi

# ───────────────────────────────────────────────
# Verificación
# ───────────────────────────────────────────────

if [[ -z "$ONLY_STACK" || "$ONLY_STACK" == "cuartel-app" ]]; then
  step "Verificando CloudFront"

  if cf_domain=$(aws cloudformation describe-stacks \
      --stack-name cuartel-app \
      --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
      --output text 2>/dev/null); then

    if [[ -n "$cf_domain" && "$cf_domain" != "None" ]]; then
      ok "CloudFront: https://$cf_domain"

      if curl -sf -o /dev/null -w "%{http_code}" "https://$cf_domain" --max-time 15; then
        ok "CloudFront responde"
      else
        warn "CloudFront aún no responde"
      fi
    fi
  fi
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy completado · CUARTEL-ERP${NC}"
echo -e "${YELLOW}  Dios · Patria · Humanidad${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
