<#
.SYNOPSIS
  Deploy automatizado de CUARTEL-ERP a AWS.

.DESCRIPTION
  Orquesta el build de Next.js, synth y deploy de los stacks CDK en orden,
  migraciones de DB y verificaciones post-deploy.

.PARAMETER Environment
  Entorno objetivo: dev (default) | staging | production

.PARAMETER SkipBuild
  No rebuildear la app Next.js (asume .next/standalone ya existe)

.PARAMETER SkipMigrations
  No correr drizzle-kit push

.PARAMETER OnlyStack
  Desplegar solo un stack específico (ej: cuartel-app)

.EXAMPLE
  ./scripts/deploy.ps1 -Environment dev

.EXAMPLE
  ./scripts/deploy.ps1 -OnlyStack cuartel-app -SkipMigrations

.NOTES
  Requiere: Node.js 20+, AWS CLI v2, cdk, psql
#>

param(
  [string]$Environment = "dev",
  [switch]$SkipBuild,
  [switch]$SkipMigrations,
  [string]$OnlyStack
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# ───────────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────────

function Write-Step {
  param([string]$Message)
  Write-Host "`n━━━ $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "   ✓ $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host "   ⚠ $Message" -ForegroundColor Yellow
}

function Assert-Tool {
  param([string]$Name, [string]$Command)
  try {
    $null = & $Command 2>&1
    Write-Ok "$Name disponible"
  } catch {
    throw "$Name no encontrado. Instale antes de continuar."
  }
}

# ───────────────────────────────────────────────────────────────
# Validaciones
# ───────────────────────────────────────────────────────────────

Write-Step "Validando prerrequisitos"

Assert-Tool "Node.js" "node --version"
Assert-Tool "npm" "npm --version"
Assert-Tool "AWS CLI" "aws --version"
Assert-Tool "CDK" "cdk --version"

# Verificar que el perfil AWS es el correcto
$caller = aws sts get-caller-identity --output json | ConvertFrom-Json
$expectedAccount = "607520774564"

if ($caller.Account -ne $expectedAccount) {
  throw "Cuenta AWS incorrecta: $($caller.Account). Se esperaba $expectedAccount (manbuild)."
}
Write-Ok "AWS account: $($caller.Account) ($($caller.Arn))"

# ───────────────────────────────────────────────────────────────
# Build Next.js
# ───────────────────────────────────────────────────────────────

Set-Location $ProjectRoot

if (-not $SkipBuild) {
  Write-Step "Validando TypeScript del proyecto"
  npx tsc --noEmit
  if ($LASTEXITCODE -ne 0) {
    throw "TypeScript tiene errores. Corrija antes de deploy."
  }
  Write-Ok "TypeScript limpio"

  Write-Step "Construyendo Next.js (output standalone)"
  $env:NODE_OPTIONS = "--max-old-space-size=4096"
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build falló" }
  Write-Ok "Build completado en .next/standalone"
} else {
  Write-Warn "Skip build (usando .next/standalone existente)"
}

# ───────────────────────────────────────────────────────────────
# CDK synth
# ───────────────────────────────────────────────────────────────

Set-Location "$ProjectRoot/infra/cdk"

Write-Step "Validando TypeScript del CDK"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  throw "CDK TypeScript tiene errores"
}
Write-Ok "CDK TypeScript limpio"

Write-Step "Sintetizando stacks"
npx cdk synth --quiet
if ($LASTEXITCODE -ne 0) { throw "cdk synth falló" }
Write-Ok "Stacks sintetizados correctamente"

# ───────────────────────────────────────────────────────────────
# Deploy
# ───────────────────────────────────────────────────────────────

if ($OnlyStack) {
  Write-Step "Desplegando stack único: $OnlyStack"
  npx cdk deploy $OnlyStack --require-approval never
  if ($LASTEXITCODE -ne 0) { throw "Deploy de $OnlyStack falló" }
  Write-Ok "$OnlyStack desplegado"
} else {
  $stacks = @(
    "cuartel-secrets",
    "cuartel-network",
    "cuartel-storage",
    "cuartel-database",
    "cuartel-scraper",
    "cuartel-app",
    "cuartel-observability"
  )

  Write-Step "Desplegando stacks en orden"
  foreach ($stack in $stacks) {
    Write-Host "   → $stack" -ForegroundColor White
    npx cdk deploy $stack --require-approval never --progress events
    if ($LASTEXITCODE -ne 0) {
      throw "Deploy de $stack falló. Verifique logs de CloudFormation."
    }
  }
  Write-Ok "Todos los stacks desplegados"
}

# ───────────────────────────────────────────────────────────────
# Post-deploy
# ───────────────────────────────────────────────────────────────

Set-Location $ProjectRoot

if (-not $SkipMigrations -and (-not $OnlyStack -or $OnlyStack -eq "cuartel-database")) {
  Write-Step "Aplicando migraciones de Drizzle"

  # Obtener DATABASE_URL del Secret
  try {
    $secret = aws secretsmanager get-secret-value `
      --secret-id cuartel-erp/db-url `
      --query SecretString `
      --output text 2>$null
    if ($secret) {
      $env:DATABASE_URL = $secret
      npm run db:push
      if ($LASTEXITCODE -ne 0) {
        Write-Warn "db:push retornó error — revisar manualmente"
      } else {
        Write-Ok "Migraciones aplicadas"
      }
    } else {
      Write-Warn "No se encontró secret cuartel-erp/db-url — aplicar migraciones manualmente"
    }
  } catch {
    Write-Warn "Error obteniendo DATABASE_URL del secret: $_"
  }
}

# ───────────────────────────────────────────────────────────────
# Verificación
# ───────────────────────────────────────────────────────────────

if (-not $OnlyStack -or $OnlyStack -eq "cuartel-app") {
  Write-Step "Verificando CloudFront distribution"

  try {
    $cfDomain = aws cloudformation describe-stacks `
      --stack-name cuartel-app `
      --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" `
      --output text 2>$null

    if ($cfDomain) {
      Write-Ok "CloudFront domain: https://$cfDomain"

      # Curl simple para health check
      try {
        $response = Invoke-WebRequest -Uri "https://$cfDomain" -UseBasicParsing -TimeoutSec 15
        Write-Ok "HTTP $($response.StatusCode) desde CloudFront"
      } catch {
        Write-Warn "CloudFront aún no responde — puede tardar minutos en propagarse"
      }
    }
  } catch {
    Write-Warn "No se pudo obtener output de cuartel-app"
  }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Deploy completado · CUARTEL-ERP" -ForegroundColor Green
Write-Host "  Dios · Patria · Humanidad" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
