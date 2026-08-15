#!/usr/bin/env bash
# ============================================================
#  Configura .env.local para el scraper CGBVP SIN abrir editores.
#  Pensado para maquinas restringidas donde solo hay Git Bash.
#
#  Uso (desde la raiz del proyecto, en Git Bash):
#     bash scripts/setup-scraper.sh
#
#  La contrasena se escribe oculta y queda SOLO en .env.local
#  (que esta en .gitignore, nunca se sube).
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
ENV=".env.local"

echo "== Configuracion del scraper CGBVP =="
read -rp "Usuario CGBVP (formato A#####): " U
read -rsp "Contrasena CGBVP: " C; echo
read -rp "AWS_PROFILE [manbuild]: " AWSP; AWSP="${AWSP:-manbuild}"
read -rp "TABLE_PREFIX [ubo163-dev]: " TP; TP="${TP:-ubo163-dev}"
read -rp "AWS_REGION [us-east-1]: " RG; RG="${RG:-us-east-1}"
read -rp "Agregar claves AWS en el archivo? (s/N): " ADDK

# Preservar cualquier linea existente que no sea de las que vamos a setear.
touch "$ENV"
grep -vE '^(USUARIO_INTRANET|CONTRASENA_INTRANET|AWS_PROFILE|AWS_REGION|TABLE_PREFIX|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=' "$ENV" > "$ENV.tmp" || true
mv "$ENV.tmp" "$ENV"

{
  echo "USUARIO_INTRANET=$U"
  echo "CONTRASENA_INTRANET=$C"
  echo "AWS_PROFILE=$AWSP"
  echo "AWS_REGION=$RG"
  echo "TABLE_PREFIX=$TP"
} >> "$ENV"

if [[ "$ADDK" =~ ^[sS] ]]; then
  read -rp "AWS_ACCESS_KEY_ID: " AK
  read -rsp "AWS_SECRET_ACCESS_KEY: " SK; echo
  {
    echo "AWS_ACCESS_KEY_ID=$AK"
    echo "AWS_SECRET_ACCESS_KEY=$SK"
  } >> "$ENV"
  echo "  (claves AWS agregadas a $ENV)"
else
  echo "  (usara el perfil AWS '$AWSP' de ~/.aws/credentials)"
fi

echo ""
echo "OK: $ENV configurado. El scraper usara el Chromium que trae puppeteer."
echo "Prueba:  npm run scraper:bomberos"
