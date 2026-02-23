# HI-DNA Frontend Platform

Welcome to the HI-DNA Frontend! This serves as the primary application interface for employees, administrators, and super administrators to manage AI-driven artifacts, documents, and social media schedules.

## Project Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4, Vanilla CSS variables for theming
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Toast Notifications**: Sonner
- **API Client**: `openapi-fetch` (fully typed from `schema.d.ts`)

---

## Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed.

### 2. Environment Variables
Create a `.env.local` file in the root directory (or `.env`):
```env
# Point this to your backend gateway URL
NEXT_PUBLIC_API_BASE_URL="http://localhost:8080"
```

### 3. Installation
Install the project dependencies and `shadcn/ui` peer dependencies:
```bash
npm install
```

### 4. Running Locally
Start the local development server:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## Running with Docker

You can easily run the frontend using Docker and Docker Compose. This setup utilizes a multi-stage `Dockerfile` and builds a minimal `standalone` image.

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and configure NEXT_PUBLIC_API_BASE_URL
   ```

2. **Build and Start Container**:
   ```bash
   docker compose up -d --build
   ```

3. **View Logs**:
   ```bash
   docker compose logs -f frontend
   ```

4. **Stop Container**:
   ```bash
   docker compose down
   ```

---

## Application Architecture

### API Client & Code Generation
We use strictly typed API interactions via `openapi-fetch`. 

The client is instantiated in `src/api/client.ts` and relies on `src/api/schema.d.ts`. If the backend API changes, you should regenerate `schema.d.ts` using the updated `openapi.yaml` specification via `openapi-typescript` CLI to maintain end-to-end type safety.

### Authentication & Authorization
Authentication tokens (JWTs) are stored securely in `localStorage` upon login (`/src/auth/AuthProvider.tsx`). The app explicitly injects this Bearer token into headers via the `useAuthedQuery` hook and `openapi-fetch` middleware.

#### Role-Based Access Control (RBAC)
There are three main roles in this application:
1. **`employee`**: Standard dashboard access, DNA document upload, Artifact generation, Chat, and Schedule viewing.
2. **`admin`**: All employee features + access to the **Templates** management page to edit company prompt templates.
3. **`super_admin`**: All admin features + access to the **Admin Dashboard** containing system metrics, workspace configuration, and the Dead Letter Queue (DLQ) viewer.

Access to routes is protected in the Next.js layouts (`src/app/app/layout.tsx`). Unauthorized access attempts to restricted routes automatically fall back to the generic dashboard.

---

## Key Technical Notes

### Server-Sent Events (SSE) Streaming
The **Chat** and **Artifact Generation** pages utilize SSE to stream responses incrementally from the backend. 
- The SSE loops parse continuous JSON chunks in real-time, handling optimistic UI updates smoothly.
- **AbortControllers** are implemented to allow users to cancel/stop the stream midway seamlessly without backend hanging.

### Theming System
We are using `next-themes` mapped with a custom palette in `src/app/globals.css`. 
The `light` and `dark` `.dark` pseudo-classes control CSS variable tokens (e.g. `--background`, `--primary-foreground`), keeping `shadcn/ui` components looking crisp under any user preference.
