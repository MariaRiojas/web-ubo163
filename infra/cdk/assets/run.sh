#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════
# run.sh — entrypoint para Lambda Web Adapter.
#
# Lambda Web Adapter busca un handler llamado 'run.sh' en el root del paquete
# y lo ejecuta. Este script arranca el server standalone generado por Next.js
# (output: 'standalone' en next.config.mjs).
#
# Este archivo se copia a .next/standalone/run.sh durante el build
# (ver instrucciones en infra/cdk/README.md → sección "Build de la Lambda").
# ═══════════════════════════════════════════════════════════════════════════
set -e

# Lambda Web Adapter inyecta PORT=3000 (ver env AWS_LWA_PORT y PORT).
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

# El output standalone genera server.js en el root del directorio.
exec node server.js
