# ═══════════════════════════════════════════════════════════════════════════
# Dockerfile del scraper CGBVP — optimizado para ECS Fargate
#
# Multi-stage:
#   - deps: instala deps de producción (incluye tsx para ejecución)
#   - runtime: imagen final con Chromium + deps + código de scraper + entrypoint
#
# Ejecución:
#   SCRAPER_TYPE=estado-cia           → scripts/scraper/entrypoints/estado-cia.ts
#   SCRAPER_TYPE=partes-cia           → scripts/scraper/entrypoints/partes-cia.ts
#   SCRAPER_TYPE=sgo                  → scripts/scraper/entrypoints/sgo.ts
#   SCRAPER_TYPE=asistencia-mensual   → scripts/scraper/entrypoints/asistencia-mensual.ts
#   SCRAPER_TYPE=bomberos             → scripts/scraper/entrypoints/bomberos.ts
#
# Variables requeridas en runtime:
#   DATABASE_URL                      (Secrets Manager via ECS)
#   USUARIO_INTRANET                  (Secrets Manager — no requerido por 'sgo')
#   CONTRASENA_INTRANET               (Secrets Manager — no requerido por 'sgo')
#   SCRAPER_TYPE                      (por task def)
#   HEADLESS=1                        (default)
#
# Opcionales:
#   SCRAPE_RANGE_DAYS=N               (para partes-cia histórico)
#   SCRAPE_MES=N, SCRAPE_ANIO=YYYY    (para asistencia-mensual override)
# ═══════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: deps — instala node_modules de producción
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Evitamos que puppeteer descargue Chromium — usaremos el del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
 && npm install --no-save tsx@4 \
 && npm cache clean --force


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: runtime — imagen final con Chromium y código
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Dependencias de Chromium (headless) + fuentes básicas
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdrm2 \
      libgbm1 \
      libnss3 \
      libxcomposite1 \
      libxdamage1 \
      libxrandr2 \
      ca-certificates \
      tini \
 && rm -rf /var/lib/apt/lists/*

# Config Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    HEADLESS=1 \
    NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps

WORKDIR /app

# Dependencias de Node ya instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./

# Código de scraper, lib compartida y configs
COPY lib/ lib/
COPY scripts/scraper/ scripts/scraper/
COPY drizzle.config.ts company.config.ts tsconfig.json ./

# Entrypoint que elige el script por SCRAPER_TYPE
COPY scripts/scraper/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Usuario no-root para seguridad
RUN groupadd -r scraper && useradd -r -g scraper -G audio,video scraper \
 && chown -R scraper:scraper /app
USER scraper

# tini como PID 1 para manejar SIGTERM/SIGKILL correctamente
# (Fargate espera que el proceso responda a SIGTERM en ≤ 30s)
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
