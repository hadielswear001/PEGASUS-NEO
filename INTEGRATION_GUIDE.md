# PEGASUS NEO - Integration Guide for ATTALL

## Overview

This guide explains how to merge PEGASUS NEO into the ATTALL project as a module. The architecture is designed to be modular, making it straightforward to integrate as a subsystem within a larger platform.

---

## Integration Strategy

### Option A: Embed as a Route/Module (Recommended)

Mount PEGASUS NEO as a sub-route within ATTALL's existing application:

```
ATTALL Application
├── /dashboard          → ATTALL main dashboard
├── /pegasus            → PEGASUS NEO (embedded)
│   ├── /pegasus/       → Supervisor Chat + Agent Sidebar + Dock
│   ├── /pegasus/agent/:slug → Individual Agent Chat
│   ├── /pegasus/toolbox     → Toolbox Panel
│   └── /pegasus/settings    → Supervisor Settings
└── /settings           → ATTALL settings
```

### Option B: Microservice Architecture

Run PEGASUS NEO as a standalone service and communicate via API:

```
┌──────────────┐     API Calls     ┌──────────────┐
│    ATTALL    │ ◄───────────────► │ PEGASUS NEO  │
│  (Main App)  │                   │  (Service)   │
└──────────────┘                   └──────────────┘
```

---

## Step-by-Step Integration (Option A)

### Step 1: Copy Core Files

Copy these directories into your ATTALL project:

```bash
# Frontend pages
cp -r client/src/pages/Home.tsx         → attall/src/modules/pegasus/Dashboard.tsx
cp -r client/src/pages/AgentChat.tsx     → attall/src/modules/pegasus/AgentChat.tsx
cp -r client/src/pages/Toolbox.tsx       → attall/src/modules/pegasus/Toolbox.tsx
cp -r client/src/pages/SupervisorSettings.tsx → attall/src/modules/pegasus/Settings.tsx

# Backend routers
cp server/routers.ts                     → attall/server/modules/pegasus/routers.ts
cp server/db.ts                          → attall/server/modules/pegasus/db.ts

# Database schema
cp drizzle/schema.ts                     → attall/drizzle/pegasus-schema.ts
cp drizzle/0001_white_husk.sql           → attall/drizzle/migrations/
```

### Step 2: Register Routes in ATTALL

In your ATTALL router (e.g., `App.tsx`):

```tsx
import PegasusDashboard from "./modules/pegasus/Dashboard";
import PegasusAgentChat from "./modules/pegasus/AgentChat";
import PegasusToolbox from "./modules/pegasus/Toolbox";
import PegasusSettings from "./modules/pegasus/Settings";

// Add to your router
<Route path="/pegasus" component={PegasusDashboard} />
<Route path="/pegasus/agent/:slug" component={PegasusAgentChat} />
<Route path="/pegasus/toolbox" component={PegasusToolbox} />
<Route path="/pegasus/settings" component={PegasusSettings} />
```

### Step 3: Merge Backend Routers

In your ATTALL tRPC router:

```typescript
import { pegasusRouter } from "./modules/pegasus/routers";

export const appRouter = router({
  // ... existing ATTALL routes
  pegasus: pegasusRouter,  // Mount all Pegasus procedures under 'pegasus' namespace
});
```

### Step 4: Apply Database Migrations

Run the Pegasus migration SQL on your ATTALL database:

```bash
mysql -u root -p attall_db < drizzle/0001_white_husk.sql
```

### Step 5: Configure LLM Access

PEGASUS NEO desktop connects to the local LM Studio endpoint:

```env
LM_STUDIO_API_BASE=http://127.0.0.1:1234/v1
```

### Step 6: Update Navigation

Add PEGASUS NEO to ATTALL's navigation menu:

```tsx
// In ATTALL's sidebar or nav component
<NavItem href="/pegasus" icon={<Shield />} label="Pegasus NEO" />
```

---

## API Contract (for Microservice Integration)

If using Option B, here are the API endpoints PEGASUS NEO exposes:

### Agents API

```
GET  /api/trpc/agents.list        → List all agents
GET  /api/trpc/agents.get?slug=X  → Get specific agent
POST /api/trpc/agents.updateStatus → Update agent state
```

### Chat API

```
GET  /api/trpc/chat.getMessages?agentSlug=X  → Get chat history
POST /api/trpc/chat.sendMessage              → Send message & get AI response
```

### Tasks API

```
GET  /api/trpc/tasks.getAll         → All tasks
GET  /api/trpc/tasks.getByAgent     → Tasks for specific agent
POST /api/trpc/tasks.create         → Create task
POST /api/trpc/tasks.updateStatus   → Update task
```

### Toolbox API

```
GET  /api/trpc/toolbox.getTools     → List all tools by category
POST /api/trpc/toolbox.executeTool  → Execute a tool
```

### Supervisor Config API

```
GET  /api/trpc/supervisorConfig.get  → Get supervisor config
POST /api/trpc/supervisorConfig.save → Save supervisor config
```

---

## Shared Dependencies

These packages are required by PEGASUS NEO. If ATTALL already uses them, ensure version compatibility:

| Package | Version | Purpose |
|---------|---------|---------|
| `@trpc/server` | ^11.6.0 | API layer |
| `@trpc/client` | ^11.6.0 | Client bindings |
| `drizzle-orm` | ^0.44.5 | Database ORM |
| `mysql2` | ^3.15.0 | MySQL driver |
| `zod` | ^4.1.12 | Input validation |
| `lucide-react` | ^0.453.0 | Icons |
| `framer-motion` | ^12.23.22 | Animations |
| `streamdown` | ^1.4.0 | Markdown rendering |

---

## Theme Integration

PEGASUS NEO uses a Dark Cyberpunk theme. To integrate with ATTALL's design system:

### Option 1: Scoped Theme (Isolated)

Wrap Pegasus pages in a theme scope:

```tsx
<div className="pegasus-theme" data-theme="dark">
  <PegasusDashboard />
</div>
```

### Option 2: Merge Theme Variables

Add Pegasus CSS variables to ATTALL's global styles:

```css
/* Pegasus-specific colors */
--pegasus-primary: oklch(0.75 0.18 160);     /* Neon green */
--pegasus-accent: oklch(0.7 0.15 220);       /* Neon blue */
--pegasus-background: oklch(0.12 0.02 260);  /* Deep dark */
```

---

## Data Flow Between ATTALL and PEGASUS

```
┌─────────────────────────────────────────────────────────┐
│                      ATTALL Platform                      │
│                                                         │
│  ┌──────────────┐     ┌──────────────────────────────┐  │
│  │ ATTALL Auth  │────►│  PEGASUS NEO Module           │  │
│  │ (User/Token) │     │                              │  │
│  └──────────────┘     │  Uses ATTALL's user context  │  │
│                       │  for all agent interactions   │  │
│  ┌──────────────┐     │                              │  │
│  │ ATTALL DB    │◄───►│  Pegasus tables (agents,     │  │
│  │ (Shared)     │     │  messages, tasks, config)    │  │
│  └──────────────┘     │                              │  │
│                       │  Shares same MySQL instance   │  │
│  ┌──────────────┐     │                              │  │
│  │ ATTALL LLM   │────►│  Uses same API key/endpoint  │  │
│  │ (Shared Key) │     │  for all AI features         │  │
│  └──────────────┘     └──────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Supervisor Prompt for ATTALL Integration

When integrating into ATTALL, update the Supervisor's system prompt to be aware of the larger platform:

```
You are Pegasus NEO Supervisor, operating as a module within the ATTALL platform.

Context:
- You have access to ATTALL's user data and permissions
- Results should be formatted for ATTALL's reporting system
- Coordinate with ATTALL's other modules when relevant

[... rest of standard supervisor prompt ...]
```

---

## Testing After Integration

```bash
# Run Pegasus-specific tests
pnpm vitest run server/agents.test.ts

# Verify API endpoints
curl http://localhost:3000/api/trpc/agents.list

# Check database tables
mysql -e "SELECT * FROM agents;" attall_db
```

---

## Checklist

- [ ] Copy frontend pages to ATTALL modules directory
- [ ] Copy backend routers and db helpers
- [ ] Apply database migrations
- [ ] Register routes in ATTALL's router
- [ ] Mount tRPC procedures under namespace
- [ ] Configure LLM API credentials
- [ ] Add navigation entry
- [ ] Test all agent interactions
- [ ] Verify theme compatibility
- [ ] Run full test suite
