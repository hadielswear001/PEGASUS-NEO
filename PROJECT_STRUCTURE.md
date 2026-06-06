# PEGASUS NEO - Project Structure

```
pegasus-neo/
│
├── client/                          # Frontend (React 19 + Tailwind 4)
│   ├── index.html                   # Entry HTML with Google Fonts
│   ├── public/                      # Static public assets
│   │   └── __manus__/
│   │       └── version.json         # Build version metadata
│   └── src/
│       ├── App.tsx                  # Root component with routing
│       ├── main.tsx                 # React entry point with providers
│       ├── index.css                # Dark Cyberpunk theme (OKLCH colors)
│       ├── const.ts                 # Frontend constants & login URL
│       ├── _core/
│       │   └── hooks/
│       │       └── useAuth.ts       # Authentication hook
│       ├── components/
│       │   ├── AIChatBox.tsx        # Reusable AI chat component
│       │   ├── DashboardLayout.tsx  # Dashboard layout shell
│       │   ├── DashboardLayoutSkeleton.tsx
│       │   ├── ErrorBoundary.tsx    # Error boundary wrapper
│       │   ├── ManusDialog.tsx      # Dialog component
│       │   ├── Map.tsx              # Google Maps integration
│       │   └── ui/                  # shadcn/ui component library
│       │       ├── accordion.tsx
│       │       ├── alert-dialog.tsx
│       │       ├── alert.tsx
│       │       ├── avatar.tsx
│       │       ├── badge.tsx
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── checkbox.tsx
│       │       ├── dialog.tsx
│       │       ├── dropdown-menu.tsx
│       │       ├── input.tsx
│       │       ├── label.tsx
│       │       ├── popover.tsx
│       │       ├── progress.tsx
│       │       ├── scroll-area.tsx
│       │       ├── select.tsx
│       │       ├── separator.tsx
│       │       ├── sheet.tsx
│       │       ├── skeleton.tsx
│       │       ├── sonner.tsx
│       │       ├── spinner.tsx
│       │       ├── switch.tsx
│       │       ├── tabs.tsx
│       │       ├── textarea.tsx
│       │       ├── toggle.tsx
│       │       ├── tooltip.tsx
│       │       └── ... (40+ components)
│       ├── contexts/
│       │   └── ThemeContext.tsx      # Dark/Light theme provider
│       ├── hooks/
│       │   ├── useComposition.ts    # Input composition hook
│       │   ├── useMobile.tsx        # Mobile detection
│       │   └── usePersistFn.ts      # Persistent function ref
│       ├── lib/
│       │   ├── trpc.ts             # tRPC client binding
│       │   └── utils.ts            # Utility functions (cn, etc.)
│       └── pages/
│           ├── Home.tsx             # ★ Main Dashboard (Supervisor + Sidebar + Dock)
│           ├── AgentChat.tsx        # ★ Individual Agent Chat Interface
│           ├── Toolbox.tsx          # ★ Categorized Security Tools Panel
│           ├── SupervisorSettings.tsx # ★ Prompt Templates & Configuration
│           ├── ComponentShowcase.tsx # UI component demo page
│           └── NotFound.tsx         # 404 page
│
├── server/                          # Backend (Express + tRPC)
│   ├── routers.ts                  # ★ All tRPC procedures (agents, chat, tasks, toolbox)
│   ├── db.ts                       # ★ Database query helpers
│   ├── storage.ts                  # S3 storage helpers
│   ├── agents.test.ts             # Vitest tests for agents/chat/tasks
│   ├── auth.logout.test.ts        # Auth logout test
│   └── _core/                      # Framework internals
│       ├── index.ts                # Server entry point
│       ├── context.ts              # tRPC context builder
│       ├── cookies.ts              # Cookie configuration
│       ├── dataApi.ts              # External data API helper
│       ├── env.ts                  # Environment variable loader
│       ├── heartbeat.ts            # Scheduled task support
│       ├── imageGeneration.ts      # AI image generation
│       ├── llm.ts                  # ★ LLM integration (invokeLLM)
│       ├── map.ts                  # Google Maps backend
│       ├── notification.ts         # Push notifications
│       ├── storageProxy.ts         # Storage proxy middleware
│       ├── systemRouter.ts         # System health router
│       ├── trpc.ts                 # tRPC initialization
│       ├── vite.ts                 # Vite dev middleware
│       ├── voiceTranscription.ts   # Whisper transcription
│       └── types/
│           ├── cookie.d.ts
│           └── manusTypes.ts
│
├── drizzle/                         # Database Layer
│   ├── schema.ts                   # ★ Table definitions (users, agents, messages, tasks, supervisorConfig)
│   ├── relations.ts                # Table relations
│   ├── 0000_majestic_union_jack.sql # Initial migration (users)
│   ├── 0001_white_husk.sql         # ★ Agents system migration
│   ├── meta/
│   │   ├── _journal.json           # Migration journal
│   │   ├── 0000_snapshot.json
│   │   └── 0001_snapshot.json
│   └── migrations/
│       └── .gitkeep
│
├── shared/                          # Shared types & constants
│   ├── const.ts                    # Shared constants (cookie name, etc.)
│   ├── types.ts                    # Shared TypeScript types
│   └── _core/
│       └── errors.ts               # Error definitions
│
├── references/                      # Project references
│   └── periodic-updates.md         # Scheduled tasks documentation
│
├── patches/                         # Dependency patches
│   └── wouter@3.7.1.patch
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite build configuration
├── vitest.config.ts                 # Test configuration
├── drizzle.config.ts               # Drizzle ORM configuration
├── components.json                  # shadcn/ui configuration
├── template.json                    # Project template metadata
├── todo.md                          # Feature tracking
├── PROJECT_STRUCTURE.md            # This file
├── ARCHITECTURE.md                 # System architecture documentation
├── INSTALLATION.md                 # Installation & setup guide
├── INTEGRATION_GUIDE.md            # Guide for merging into ATTALL
├── .env.example                    # Environment variables template
├── start.sh                        # Unix startup script
├── start.bat                       # Windows startup script
└── .gitignore                      # Git ignore rules
```

## Key Files (★ = Core Business Logic)

| File | Purpose |
|------|---------|
| `client/src/pages/Home.tsx` | Main dashboard with Supervisor Chat, Agent Sidebar, and Agent Dock |
| `client/src/pages/AgentChat.tsx` | Individual agent communication interface |
| `client/src/pages/Toolbox.tsx` | Security tools panel with parameter inputs |
| `client/src/pages/SupervisorSettings.tsx` | Prompt templates and supervisor configuration |
| `server/routers.ts` | All API endpoints (agents, chat, tasks, toolbox, supervisor) |
| `server/db.ts` | Database operations for all entities |
| `server/_core/llm.ts` | LLM integration for AI-powered responses |
| `drizzle/schema.ts` | Database schema (agents, messages, tasks, supervisorConfig) |
| `client/src/index.css` | Dark Cyberpunk theme with neon colors |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, TypeScript, Wouter |
| UI Components | shadcn/ui, Radix UI, Lucide Icons |
| State Management | TanStack Query (via tRPC) |
| Backend | Express 4, tRPC 11, TypeScript |
| Database | MySQL/TiDB via Drizzle ORM |
| AI/LLM | OpenAI-compatible API (via built-in helpers) |
| Build Tool | Vite 7 |
| Testing | Vitest |
| Package Manager | pnpm |
