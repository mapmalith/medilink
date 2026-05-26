# MEDI LINK — Medical Appointment Platform

## Project Overview

Medical appointment platform for tourists visiting Sri Lanka.
Three appointment types: House Call, Tele-Consultation, Medical Visit.
Five user roles: Patient, Doctor, Hotel/Agent, Admin, Call Center.

## Tech Stack

- Backend: NestJS 10 (TypeScript), Prisma ORM, PostgreSQL 16
- Frontend: Next.js 14 (App Router), shadcn/ui, Kibo UI, Tailwind CSS
- State: Zustand + TanStack Query
- Forms: React Hook Form + Zod
- Queue: BullMQ + Redis (Upstash QStash for production free tier)
- Video: Daily.co
- Payments: Stripe
- WhatsApp: Meta Cloud API
- Monorepo: Turborepo + pnpm

## Project Structure

- apps/api — NestJS backend
- apps/web — Next.js frontend
- packages/shared-types — Shared TypeScript types
- packages/validation — Shared Zod schemas

## Conventions

- Use TypeScript strict mode everywhere
- Use Zod for all API input validation
- Use Prisma for all database access (no raw SQL)
- Use NestJS Guards for RBAC: @Roles(Role.ADMIN) decorator pattern
- Frontend uses shadcn/ui for base components, Kibo UI for Gantt/Kanban/Calendar/List
- All API responses follow: { success: boolean, data?: T, error?: string }
- Use kebab-case for file names, PascalCase for components
- Commit messages: conventional commits (feat:, fix:, chore:)

## Key Domain Rules

- Appointment status flow: PENDING_PAYMENT → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED
- Additional statuses: CANCELLED, EXPIRED, RESCHEDULED
- Rescheduling: only Admin and Call Center can reschedule; max 3 times per appointment
- Rescheduling releases old time slot, books new one, carries over payment
- Minimum 2 hours notice required before rescheduling
- House calls require payment before visit
- Tele-consultation slots auto-generated from doctor weekly availability
- Payment timeout cancels appointment and releases slot
- Hotels have credit limits; can pay via credit or payment link
- All medical data (diagnosis, prescriptions) encrypted at rest
- QR codes link to specific hotels; encode hotel ID in URL

## Current Phase

Phase 6: Patient Experience

## Commands

- pnpm dev — Start both API and web in dev mode
- pnpm db:migrate — Run Prisma migrations
- pnpm db:seed — Seed database with sample data
- pnpm db:studio — Open Prisma Studio
- pnpm lint — Run ESLint across all packages
- pnpm build — Build all packages
