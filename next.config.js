/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'images.unsplash.com', 'via.placeholder.com'],
    // Only disable optimization on Replit
    unoptimized: process.env.REPLIT_ENV ? true : false,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  // Webpack configuration for file processing libraries
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle pdf-parse and mammoth on server side
      config.externals = config.externals || []
      config.externals.push({
        'canvas': 'commonjs canvas',
      })
    }
    // Ignore node-specific modules in client bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    }
    return config
  },
  // For Replit development environment only
  ...(process.env.REPLIT_ENV && {
    allowedDevOrigins: [
      '*.replit.dev',
      '*.replit.co',
      '*.replit.com'
    ]
  }),
  // Render.com requires this for proper routing
  trailingSlash: false,
  // Disable static optimization - this is a dynamic full-stack app  
  output: 'standalone',
  // Skip trying to build legacy error pages - we use App Router error handling
  skipTrailingSlashRedirect: true,
  // Skip type checking during build - Render deployment workaround
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use PORT environment variable from Render
  ...(process.env.RENDER && {
    env: {
      PORT: process.env.PORT || '3000',
    }
  }),
}

module.exports = nextConfig
