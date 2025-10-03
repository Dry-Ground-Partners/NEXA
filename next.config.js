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
  // Use PORT environment variable from Render
  ...(process.env.RENDER && {
    env: {
      PORT: process.env.PORT || '3000',
    }
  }),
}

module.exports = nextConfig
