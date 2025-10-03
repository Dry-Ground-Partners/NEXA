# Overview

This is a full-stack React application built with Express.js backend, featuring a modern development stack with TypeScript, Vite, and Tailwind CSS. The project follows a monorepo structure with shared types and schemas between frontend and backend. It includes a comprehensive UI component library based on shadcn/ui and Radix UI primitives, with PostgreSQL database integration through Drizzle ORM. The application is set up for both development and production deployment with proper build processes and environment configurations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side application is built using React 18 with TypeScript and follows a component-based architecture. The project uses Vite as the build tool for fast development and optimized production builds. The UI layer leverages Tailwind CSS for styling with a complete design system implementation.

**Key Frontend Decisions:**
- **React Router:** Uses Wouter for lightweight client-side routing instead of React Router
- **State Management:** TanStack Query (React Query) for server state management with custom query client configuration
- **UI Components:** Comprehensive component library built on Radix UI primitives with shadcn/ui styling patterns
- **Form Handling:** React Hook Form with Zod validation through @hookform/resolvers
- **Styling:** Tailwind CSS with CSS custom properties for theming support (light/dark modes)

The component structure follows atomic design principles with reusable UI components in `/components/ui/` and page components in `/pages/`. Custom hooks are organized in `/hooks/` for shared logic like mobile detection and toast notifications.

## Backend Architecture

The server-side application uses Express.js with TypeScript in ES module format. The architecture follows a layered approach with clear separation of concerns between routing, storage, and middleware.

**Key Backend Decisions:**
- **Framework:** Express.js with TypeScript for type safety
- **Module System:** ES modules (type: "module") for modern JavaScript features
- **Development Server:** Custom Vite integration for hot module replacement in development
- **Error Handling:** Centralized error handling middleware with proper HTTP status codes
- **Logging:** Custom request logging middleware for API routes

The server structure includes route registration in `/server/routes.ts` with a storage abstraction layer that supports both in-memory storage (development) and database persistence (production).

## Data Storage Solutions

The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema is shared between frontend and backend through the `/shared/schema.ts` file.

**Database Architecture:**
- **ORM:** Drizzle ORM with full TypeScript integration
- **Database:** PostgreSQL (configured for Neon serverless)
- **Migrations:** Drizzle Kit for schema management and migrations
- **Schema Validation:** Zod schemas generated from Drizzle tables for runtime validation

The storage layer implements an interface-based approach allowing for easy switching between in-memory storage (development/testing) and database persistence (production).

## Authentication and Authorization

The application is prepared for session-based authentication with PostgreSQL session storage through connect-pg-simple. The user schema includes basic username/password fields with unique constraints.

**Auth Design:**
- **Session Management:** Express sessions with PostgreSQL storage
- **User Model:** Simple username/password based authentication
- **Security:** Prepared for credential-based authentication flow

## External Dependencies

- **Database:** Neon PostgreSQL serverless database (@neondatabase/serverless)
- **UI Framework:** Radix UI primitives for accessible components
- **Validation:** Zod for runtime type validation and schema generation
- **Styling:** Tailwind CSS with PostCSS for processing
- **Development Tools:** Vite for fast builds and development server
- **Date Handling:** date-fns for date manipulation utilities
- **Icons:** Lucide React for consistent icon library
- **Carousel:** Embla Carousel for image/content carousels