/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'images.unsplash.com', 'via.placeholder.com'],
    unoptimized: true, // For Replit compatibility
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  // For Replit development environment
  ...(process.env.REPLIT_ENV && {
    allowedDevOrigins: [
      '*.replit.dev',
      '*.replit.co',
      '*.replit.com'
    ]
  }),
  // Enable static file serving
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  trailingSlash: false,
}

module.exports = nextConfig
