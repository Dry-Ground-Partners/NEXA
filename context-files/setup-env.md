# Environment Setup Guide

Create a `.env.local` file in your project root with the following variables:

## Required Variables

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/nexa_db"

# Authentication Secrets  
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
NEXTAUTH_SECRET="your-nextauth-secret-different-from-jwt"

# Application URL (for production)
NEXTAUTH_URL="http://localhost:3000"
```

## Optional Variables (for future features)

```env
# AI Integration
OPENAI_API_KEY="sk-your-openai-api-key"
LANGFUSE_SECRET_KEY="sk-your-langfuse-secret"
LANGFUSE_PUBLIC_KEY="pk-your-langfuse-public"
LANGFUSE_HOST="https://cloud.langfuse.com"

# Image Services
IMGBB_API_KEY="your-imgbb-api-key"

# Email (future implementation)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## Generate Secrets

You can generate secure secrets using:

```bash
# For JWT_SECRET and NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator
# https://generate-secret.vercel.app/32
```

## Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE nexa_db;
CREATE USER nexa_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nexa_db TO nexa_user;
```

2. Update the DATABASE_URL with your actual credentials:
```env
DATABASE_URL="postgresql://nexa_user:your_password@localhost:5432/nexa_db"
```

## Verification

After creating `.env.local`, verify your setup:

```bash
# Check if Next.js can read the environment variables
npm run dev

# Look for any database connection errors in the console
```

The application should start without errors on `http://localhost:3000`.


