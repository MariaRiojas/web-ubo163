#!/bin/sh
# Entrypoint Docker para scraper CGBVP.
# Selecciona el script entrypoint según la variable SCRAPER_TYPE.
#
# Valores válidos:
#   estado-cia
#   partes-cia
#   sgo
#   asistencia-mensual
#   bomberos
set -e

if [ -z "${SCRAPER_TYPE}" ]; then
  echo "ERROR: SCRAPER_TYPE no definido. Valores válidos: estado-cia, partes-cia, sgo, asistencia-mensual, bomberos" >&2
  exit 64
fi

case "${SCRAPER_TYPE}" in
  estado-cia|partes-cia|sgo|asistencia-mensual|bomberos)
    ENTRYPOINT_FILE="scripts/scraper/entrypoints/${SCRAPER_TYPE}.ts"
    ;;
  *)
    echo "ERROR: SCRAPER_TYPE='${SCRAPER_TYPE}' no reconocido. Valores válidos: estado-cia, partes-cia, sgo, asistencia-mensual, bomberos" >&2
    exit 64
    ;;
esac

echo "[docker-entrypoint] ejecutando ${ENTRYPOINT_FILE}"
exec node --import tsx "${ENTRYPOINT_FILE}"
