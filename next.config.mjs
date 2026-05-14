let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
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
