# NEXA - AI-Powered Solution Architecture Platform

A modern recreation of the NEXA platform using Next.js, React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 16+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env.local` file with:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/nexa_db"
JWT_SECRET="your-super-secret-jwt-key-here"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

3. **Set up the database:**
```bash
# Run the SQL scripts in order:
psql -d nexa_db -f database/01_create_extensions.sql
psql -d nexa_db -f database/02_create_tables.sql
psql -d nexa_db -f database/03_create_indexes.sql
psql -d nexa_db -f database/04_functions_triggers.sql
psql -d nexa_db -f database/05_seed_data.sql
```

4. **Start the development server:**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Architecture

### Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS with custom NEXA design system
- **Database:** PostgreSQL with JSONB for flexible data storage
- **Authentication:** JWT-based session management
- **UI Components:** Custom components built with Radix UI primitives

### Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   └── globals.css        # Global styles with NEXA design system
├── components/
│   ├── layout/            # Layout components (Header, Footer)
│   └── ui/                # Reusable UI components
├── lib/
│   └── utils.ts           # Utility functions
└── types/
    └── index.ts           # TypeScript type definitions

database/
├── 01_create_extensions.sql    # PostgreSQL extensions
├── 02_create_tables.sql        # Main database schema
├── 03_create_indexes.sql       # Performance indexes
├── 04_functions_triggers.sql   # Database functions and triggers
└── 05_seed_data.sql           # Sample data
```

## 🎨 Design System

The NEXA design system replicates the original platform's dark theme with modern Tailwind CSS classes:

### Colors
- **Background:** `#0a0a0a` (Almost black)
- **Cards:** `#000000` (Pure black) 
- **Text:** `#e9ecef` (Light gray)
- **Borders:** `#495057` (Medium gray)
- **Inputs:** `#212529` (Dark gray)
- **Accent:** `#ffffff` (White)

### Components
- **Tool Cards:** Interactive cards with hover effects
- **Forms:** Dark-themed inputs with focus states
- **Buttons:** White primary buttons with hover animations
- **Navigation:** Collapsible header navigation

## 🗄️ Database Schema

### Core Tables

- **users** - User accounts and profiles
- **organizations** - Company/team organizations  
- **organization_memberships** - Many-to-many user-org relationships
- **user_sessions** - Authentication sessions
- **ai_architecture_sessions** - NEXA project sessions (JSONB storage)

### Key Features

- **JSONB Storage:** Flexible data structures like original NEXA
- **Role-Based Access:** Owner, Admin, Member, Viewer, Billing roles
- **Usage Tracking:** Monitor AI calls, PDF exports, storage usage
- **Audit Logging:** Track all user actions for compliance

## 🔐 Authentication

### Current Implementation
- Login/Register pages with NEXA design
- Form validation and error handling
- Password strength checking
- Session management structure ready

### Next Steps (TODO)
- JWT token generation and validation
- Protected route middleware
- Organization switching
- OAuth integration (Google, Microsoft)

## 📱 Pages Implemented

### ✅ Completed
- **Login Page** (`/auth/login`) - Replicates NEXA login design
- **Register Page** (`/auth/register`) - Full registration form
- **Dashboard** (`/dashboard`) - Tool cards and navigation

### 🚧 Planned
- **Solution Documents** (`/solutioning`)
- **Statement of Work** (`/sow`) 
- **Level of Effort** (`/loe`)
- **Visual Diagrams** (`/visuals`)
- **Content Structuring** (`/structuring`)
- **Session Management** (`/sessions`)

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Design System Classes

Use these Tailwind classes for consistent NEXA styling:

```css
/* Backgrounds */
.nexa-background     /* #0a0a0a page background */
.nexa-card           /* #000000 card background with border */

/* Inputs */
.nexa-form-input     /* Dark input styling */
.nexa-form-label     /* Muted label styling */

/* Buttons */
.nexa-btn-primary    /* White button with hover effects */
.nexa-btn-secondary  /* Dark button variant */

/* Layout */
.tool-card           /* Interactive tool card with hover */
.nav-button          /* Navigation button styling */
```

## 🔮 Next Phase: Backend Integration

### Immediate TODOs
1. **Prisma ORM Setup** - Database connection and models
2. **Authentication API** - JWT login/register endpoints  
3. **Session Management** - Middleware for protected routes
4. **Organization Management** - CRUD operations

### Future Features
- **AI Integration** - OpenAI GPT-4o for solution generation
- **PDF Generation** - WeasyPrint service for documents
- **Real-time Collaboration** - WebSocket updates
- **Usage Analytics** - Billing and limits tracking

## 📝 Notes

- **Database Ready:** All SQL scripts provided, run them in order
- **TypeScript:** Full type coverage with custom interfaces
- **Responsive:** Mobile-first design with Tailwind breakpoints
- **Accessible:** Built with Radix UI primitives for accessibility
- **Performant:** Optimized with Next.js 14 and modern React patterns

The foundation is complete - the next step is implementing the authentication backend and connecting to the database!

## 🤝 Contributing

This is a recreation of the original NEXA platform. The design closely follows the original specifications while using modern React and TypeScript patterns.


