# Environment Setup for Registration & Email System

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/nexa_platform"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-at-least-32-characters-long"
NEXTAUTH_SECRET="your-nextauth-secret-for-session-encryption" 
NEXTAUTH_URL="http://localhost:3000"

# Azure Email Service
AZURE_EMAIL_ENDPOINT="https://your-function-app.azurewebsites.net/api/send-email"
AZURE_EMAIL_TOKEN="your-azure-function-access-token"

# Optional: For development
NODE_ENV="development"
```

## Azure Email Service Setup

Your Azure Function should expect the following payload:

```typescript
interface EmailPayload {
  to: string
  subject: string
  template: 'email-verification' | 'organization-invitation' | 'welcome'
  data: {
    userName?: string
    verificationUrl?: string
    organizationName?: string
    inviterName?: string
    role?: string
    invitationUrl?: string
    dashboardUrl?: string
  }
}
```

## Email Templates Required

### 1. Email Verification Template (`email-verification`)
- **Subject**: "Verify your NEXA account"
- **Variables**: `userName`, `verificationUrl`, `organizationName?`

### 2. Organization Invitation Template (`organization-invitation`)  
- **Subject**: "You're invited to join {organizationName} on NEXA"
- **Variables**: `inviterName`, `organizationName`, `role`, `invitationUrl`

### 3. Welcome Template (`welcome`)
- **Subject**: "Welcome to NEXA!"
- **Variables**: `userName`, `organizationName?`, `dashboardUrl`

## Database Setup

1. **Apply the existing SQL files**:
   ```bash
   # Run these in order:
   psql -d nexa_platform -f database/01_create_extensions.sql
   psql -d nexa_platform -f database/02_create_tables.sql
   psql -d nexa_platform -f database/03_create_indexes.sql
   psql -d nexa_platform -f database/04_functions_triggers.sql
   psql -d nexa_platform -f database/05_seed_data.sql
   ```

2. **Install Prisma**:
   ```bash
   npm install prisma @prisma/client
   npx prisma generate
   ```

3. **Verify connection**:
   ```bash
   npx prisma db pull  # Should show existing schema
   ```

## Implementation Checklist

- [ ] Set up PostgreSQL database
- [ ] Configure environment variables
- [ ] Set up Azure email function
- [ ] Install Prisma dependencies
- [ ] Test email sending functionality
- [ ] Test complete registration flow
- [ ] Verify email verification flow
- [ ] Test organization creation
- [ ] Test domain-based auto-join

