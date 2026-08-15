import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    '@aws-sdk/client-secrets-manager',
    '@aws-sdk/client-lambda',
    'bwip-js',
  ],
  // ──────────────────────────────────────────────────────────────────────
  // outputFileTracingRoot — fijar la raíz del trazado de archivos al
  // directorio del proyecto. Sin esto, Next 15.5+ infiere la raíz buscando
  // el lockfile más cercano hacia arriba y encuentra un package-lock.json
  // ajeno en C:\Users\User\, lo que anida el standalone bajo
  // `Desktop/PERSONAL/Bomberos/web-ubo163/` y rompe el deploy del Lambda
  // (server.js no queda en la raíz → "Cannot find module server.js").
  // ──────────────────────────────────────────────────────────────────────
  outputFileTracingRoot: __dirname,
  // ──────────────────────────────────────────────────────────────────────
  // output: 'standalone'
  // Genera .next/standalone/ con un server.js minimalista + node_modules
  // tree-shaken. Requerido para empaquetar Next en un zip de Lambda o en
  // un contenedor pequeño sin arrastrar todo node_modules.
  //
  // Documentación: https://nextjs.org/docs/app/api-reference/next-config-js/output
  // ──────────────────────────────────────────────────────────────────────
  output: 'standalone',

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    serverActions: {
      allowedOrigins: ['d1bno1kyerz6hk.cloudfront.net'],
    },
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
