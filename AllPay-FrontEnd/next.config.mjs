/** @type {import('next').NextConfig} */
const nextConfig = {
  // trailingSlash: true,
  bundlePagesRouterDependencies: true,
  distDir: 'dist',
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  compress: true,
  crossOrigin: 'anonymous',
  devIndicators: { optimized: true },
  
  // CRÍTICO para ECS/Fargate: Standalone output reduce tamaño y mejora rendimiento
  output: 'standalone',
  
  // Configuración de Server Actions para evitar inconsistencias entre builds
  experimental: {
    serverActions: {
      // Asegurar que las acciones sean consistentes entre builds
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    config.cache = false;
    
    // Configuración para manejar módulos de Node.js en el cliente
    if (!isServer) {
      // Alias explícitos para evitar que Webpack intente resolver esquemas `node:`
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': false,
        'node:stream': false,
        'node:buffer': false,
        'node:util': false,
        'node:url': false,
        'node:querystring': false,
        'node:http': false,
        'node:https': false,
        'node:assert': false,
        'node:constants': false,
        'node:vm': false,
        'node:zlib': false,
        // Forzar el build de navegador de PptxGenJS para evitar entradas Node
        
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        assert: false,
        constants: false,
        vm: false,
        zlib: false,
        // Específicamente para los módulos con prefijo 'node:'
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': false,
        'node:stream': false,
        'node:buffer': false,
        'node:util': false,
        'node:url': false,
        'node:querystring': false,
        'node:http': false,
        'node:https': false,
        'node:assert': false,
        'node:constants': false,
        'node:vm': false,
        'node:zlib': false,
      };

      // Configuración adicional para ignorar completamente estos módulos
      config.externals = config.externals || [];
      config.externals.push({
        'node:fs': 'commonjs node:fs',
        'node:path': 'commonjs node:path',
        'node:crypto': 'commonjs node:crypto',
        'node:stream': 'commonjs node:stream',
        'node:buffer': 'commonjs node:buffer',
        'node:util': 'commonjs node:util',
        'node:url': 'commonjs node:url',
        'node:os': 'commonjs node:os',
        'node:http': 'commonjs node:http',
        'node:https': 'commonjs node:https',
      });
    }
    
    return config;
  },
  transpilePackages: ['pptxgenjs', 'jszip'],
  compiler: {
    // CRÍTICO: NO eliminar console.log en producción para debugging
    // false = NO eliminar ningún console.log
    removeConsole: false,
    styledComponents: true,
  },
  env: {
    BASE_API_URL: process.env.BASE_API_URL,
    BASE_OPEN_PAY: process.env.BASE_OPEN_PAY,
    API_KEY: process.env.API_KEY,
    MERCHANT_ID: process.env.MERCHANT_ID,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aws-fedecacao-2025.s3.sa-east-1.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;

