FROM node:20-slim

# Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium fonts-liberation libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdrm2 libgbm1 libnss3 libxcomposite1 libxdamage1 \
    libxrandr2 xdg-utils --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV HEADLESS=1

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm i puppeteer cheerio tsx
COPY lib/ lib/
COPY scripts/scraper/ scripts/scraper/
COPY drizzle.config.ts company.config.ts tsconfig.json ./

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/ || exit 1
CMD ["npx", "tsx", "scripts/scraper/main.ts"]
