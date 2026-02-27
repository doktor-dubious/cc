# Compliance Circle - Claude Code Instructions

## Project Overview

Compliance Circle is a Next.js 16 web application for compliance management and CIS 18 Controls tracking. It's a multi-tenant SaaS platform with role-based access control.

## Purpose
Compliance Circle helps organizations track and manage their CIS 18 security controls compliance.
Users create tasks linked to specific safeguards, upload evidence artifacts, and generate compliance reports. The platform supports multiple organizations with role-based access.

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript 5
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Better Auth (email/password, OAuth, 2FA)
- **Styling**: Tailwind CSS 4, Radix UI, CVA for component variants
- **i18n**: next-intl (en, da, sv, no, fr, de, es)
- **Logging**: Pino

## Project Structure

```
src/
├── app/
│   ├── (authorized)/     # Protected routes (require auth)
│   ├── (unauthorized)/   # Public routes (login, 2fa, about)
│   └── api/              # API routes
├── components/
│   └── ui/               # Reusable UI components (CVA-based)
├── context/              # React contexts (User, Organization, Task)
├── lib/
│   ├── auth.ts           # Better Auth server config
│   ├── auth-client.ts    # Better Auth client instance
│   ├── auth/permissions.ts # RBAC permission checks
│   ├── database/         # Repository pattern (user.ts, task.ts, etc.)
│   ├── prisma.ts         # Prisma client
│   └── log.ts            # Pino logger
├── constants/            # App constants, CIS controls definitions
├── types/                # TypeScript type definitions
└── i18n/                 # Internationalization config
```

## Key Patterns

### API Routes
```typescript
// Pattern: auth check -> permission check -> validate -> query -> respond
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (!canFetchTasks(session.user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const data = await taskRepository.findMany();
  return Response.json({ data });
}
```

### Database Repository Pattern
```typescript
// Located in /lib/database/[entity].ts
export const userRepository = {
  async findById(id: string): Promise<SafeUser | null> { ... },
  async findByEmail(email: string): Promise<SafeUser | null> { ... },
};
```

### UI Components (CVA)
```typescript
// Use class-variance-authority for variant-based components
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
});
```

## Authentication & Authorization

- **Server-side**: `getServerSession()` from `@/lib/auth`
- **Client-side**: `useSession()` from `@/lib/auth-client`
- **Roles**: USER, ADMIN, SUPER_ADMIN
- **Permissions**: Check via functions in `/lib/auth/permissions.ts`

## Database

- Schema in `prisma/schema.prisma`
- Run migrations: `npx prisma migrate dev`
- Generate client: `npx prisma generate`
- Key models: User, Organization, Profile, Task, Artifact, Event

## Coding Conventions

- Use TypeScript strict mode - provide explicit types
- Use path alias `@/*` for imports from `src/`
- Arrow functions for callbacks
- Named exports for utilities
- PascalCase for components, camelCase for variables/functions
- Log operations with pino: `log.info()`, `log.error()`
- API responses use `ApiResponse<T>` type pattern

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret key
- `GOOGLE_CLIENT_ID/SECRET` - OAuth (optional)
- `MICROSOFT_CLIENT_ID/SECRET` - OAuth (optional)

## Important Notes

- Protected routes are under `(authorized)/` route group
- All database queries go through repository functions in `/lib/database/`
- CIS Controls are defined in constants, not database
- Multi-tenant: Organization is the primary tenant model
- Translations are in `/messages/[locale].json`
