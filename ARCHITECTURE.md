# PEGASUS NEO - System Architecture

## Overview

PEGASUS NEO is an **Agentic Security Operating System** that combines AI-powered task coordination with specialized cybersecurity agents. The system follows a **Supervisor-Agent** pattern where a central AI coordinator delegates tasks to domain-specific agents, each equipped with their own tools and conversation context.

```
┌─────────────────────────────────────────────────────────────────┐
│                        PEGASUS NEO OS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │ Agent Manager │    │         Supervisor Chat               │   │
│  │   Sidebar     │    │  ┌─────────────────────────────────┐ │   │
│  │              │    │  │  LLM-Powered Task Distribution  │ │   │
│  │ ● Recon     │    │  │  • Analyze user request          │ │   │
│  │ ● Research  │    │  │  • Route to appropriate agents   │ │   │
│  │ ● Analysis  │    │  │  • Coordinate multi-agent tasks  │ │   │
│  │ ● Exploit   │    │  └─────────────────────────────────┘ │   │
│  │ ● Web       │    │                                        │   │
│  │ ● OSINT     │    │  [User Input] ─────────────────────── │   │
│  └──────────────┘    └──────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Agent Dock (Live)                       │   │
│  │  [Recon:idle] [Research:busy] [Analysis:active] [...]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Supervisor

The **Supervisor** is the central intelligence layer that manages all agent interactions.

### Responsibilities
- Analyze incoming user requests using LLM
- Determine which agent(s) should handle each task
- Break complex tasks into subtasks for parallel agent execution
- Coordinate results from multiple agents
- Maintain conversation context across sessions

### Architecture

```
User Request
     │
     ▼
┌─────────────────────┐
│   Supervisor LLM    │
│                     │
│  System Prompt:     │
│  • Agent catalog    │
│  • Routing rules    │
│  • Response format  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Task Router       │
│                     │
│  Keyword Detection: │
│  • "network" → Recon│
│  • "web app" → Web  │
│  • "person" → OSINT │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Task Creation      │
│                     │
│  For each agent:    │
│  • Create task      │
│  • Set status=busy  │
│  • Queue execution  │
└─────────────────────┘
```

### Prompt System

The Supervisor uses a customizable prompt system with 5 pre-built templates:

| Template | Use Case |
|----------|----------|
| **Default** | Standard task routing with all agents |
| **Stealth Mode** | Passive reconnaissance, minimal footprint |
| **Full Assault** | Maximum coverage, parallel agent deployment |
| **Web Focus** | OWASP-aligned web application testing |
| **OSINT Investigation** | Deep open-source intelligence gathering |

### Code Location
- Frontend: `client/src/pages/Home.tsx` (Supervisor Chat UI)
- Frontend: `client/src/pages/SupervisorSettings.tsx` (Prompt Configuration)
- Backend: `server/routers.ts` → `chat.sendMessage` procedure
- Config: `drizzle/schema.ts` → `supervisorConfig` table

---

## 2. Agent Manager

The **Agent Manager** provides visibility and control over all specialized agents.

### Agent Registry

| Agent | Slug | Category | Tools |
|-------|------|----------|-------|
| Recon Agent | `recon` | recon | nmap, shodan, theHarvester |
| Research Agent | `research` | research | maltego, spiderfoot, recon-ng |
| Analysis Agent | `analysis` | analysis | nikto, wapiti, code_scanner |
| Exploitation Agent | `exploitation` | exploitation | metasploit, sqlmap, hydra |
| Web Agent | `web` | web | burpsuite, owasp_zap, xsstrike |
| OSINT Agent | `osint` | osint | email_harvester, social_hunter |

### Agent States

```
┌────────┐     Task Assigned     ┌────────┐
│  IDLE  │ ──────────────────── │  BUSY  │
└────┬───┘                       └────┬───┘
     │                                │
     │    Activated                    │   Processing Complete
     │                                │
     ▼                                ▼
┌────────┐                       ┌────────┐
│ ACTIVE │                       │ IDLE   │
└────────┘                       └────────┘
     │
     │    Error Occurred
     ▼
┌────────┐
│ ERROR  │
└────────┘
```

### Visual Indicators
- **Green pulse** → Active (currently responding)
- **Blue pulse** → Busy (processing a task)
- **Gray dot** → Idle (waiting for tasks)
- **Red dot** → Error state

### Code Location
- Frontend: `client/src/pages/Home.tsx` (Sidebar section)
- Backend: `server/routers.ts` → `agents.*` procedures
- Database: `drizzle/schema.ts` → `agents` table

---

## 3. Agent Dock

The **Agent Dock** is a real-time activity monitor displayed at the bottom of the screen.

### Features
- Live status updates (5-second polling interval)
- Latest task per agent with status badge
- Click-to-navigate to individual agent chat
- Horizontal scrollable layout for all agents

### Data Flow

```
┌──────────────┐     5s Polling     ┌──────────────┐
│   Frontend   │ ◄────────────────  │   Backend    │
│  Agent Dock  │                    │  tasks.getAll│
└──────────────┘                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │   Database   │
                                    │  tasks table │
                                    └──────────────┘
```

### Display Format
```
┌─────────────────────────────────────────────────────────────┐
│ Agent Dock — Live Activity                        6 tasks   │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │● Recon   │ │● Research│ │● Analysis│ │● Exploit │ ...    │
│ │ idle     │ │ running: │ │ completed│ │ pending: │       │
│ │ No tasks │ │ Scan... │ │ Vuln... │ │ Payload..│       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Code Location
- Frontend: `client/src/pages/Home.tsx` (footer section)
- Backend: `server/routers.ts` → `tasks.getAll` procedure
- Database: `drizzle/schema.ts` → `tasks` table

---

## 4. Toolbox

The **Toolbox** provides direct access to all cybersecurity tools organized by category.

### Tool Categories

```
┌─────────────────────────────────────────────────┐
│                   TOOLBOX                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  🟢 Reconnaissance (6 tools)                    │
│     nmap, shodan, theHarvester,                 │
│     recon-ng, spiderfoot, metagoofil            │
│                                                 │
│  🔴 Exploitation (6 tools)                      │
│     metasploit, sqlmap, commix,                 │
│     hydra, hashcat, john                        │
│                                                 │
│  🟣 Wireless (5 tools)                          │
│     aircrack-ng, kismet, wifite,                │
│     reaver, fluxion                             │
│                                                 │
│  🔵 Web Attacks (6 tools)                       │
│     burpsuite, owasp_zap, nikto,                │
│     xsstrike, wpscan, dirbuster                 │
│                                                 │
│  🔵 OSINT (6 tools)                             │
│     maltego, email_harvester,                   │
│     social_hunter, ip_geolocator,               │
│     phone_tracker, domain_enum                  │
│                                                 │
│  Total: 29 Tools                                │
└─────────────────────────────────────────────────┘
```

### Execution Flow

```
User selects tool → Fills parameters → Clicks Execute
         │                                    │
         ▼                                    ▼
┌─────────────────┐              ┌─────────────────┐
│ Parameter Form  │              │ tRPC Mutation    │
│                 │              │ toolbox.execute  │
│ • target        │              └────────┬────────┘
│ • ports         │                       │
│ • options       │                       ▼
└─────────────────┘              ┌─────────────────┐
                                 │   LLM Engine    │
                                 │                 │
                                 │ Simulates tool  │
                                 │ output based on │
                                 │ tool + params   │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  Output Panel   │
                                 │  (Markdown)     │
                                 └─────────────────┘
```

### Code Location
- Frontend: `client/src/pages/Toolbox.tsx`
- Backend: `server/routers.ts` → `toolbox.*` procedures

---

## 5. Database

The database uses **MySQL/TiDB** with **Drizzle ORM** for type-safe queries.

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │     messages     │       │    agents    │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │◄──┐   │ id (PK)          │   ┌──►│ id (PK)      │
│ openId       │   │   │ agentSlug        │───┘   │ name         │
│ name         │   │   │ role             │       │ slug (UQ)    │
│ email        │   └───│ userId           │       │ description  │
│ role         │       │ content          │       │ category     │
│ createdAt    │       │ createdAt        │       │ status       │
│ updatedAt    │       └──────────────────┘       │ systemPrompt │
│ lastSignedIn │                                   │ tools (JSON) │
└──────────────┘       ┌──────────────────┐       │ createdAt    │
                       │      tasks       │       └──────────────┘
┌──────────────┐       ├──────────────────┤
│supervisorCfg │       │ id (PK)          │
├──────────────┤       │ agentSlug        │───────► agents.slug
│ id (PK)      │       │ title            │
│ userId       │───┐   │ description      │
│ systemPrompt │   │   │ status           │
│ routingRules │   │   │ result           │
│ createdAt    │   └───│ userId           │
│ updatedAt    │       │ createdAt        │
└──────────────┘       │ updatedAt        │
                       └──────────────────┘
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Local desktop owner account | openId, name, email, role |
| `agents` | Agent registry | slug, name, category, status, tools, systemPrompt |
| `messages` | Chat history | agentSlug, userId, role, content |
| `tasks` | Task queue | agentSlug, userId, title, status, result |
| `supervisorConfig` | Supervisor settings | userId, systemPrompt, routingRules |

### Code Location
- Schema: `drizzle/schema.ts`
- Queries: `server/db.ts`
- Migrations: `drizzle/0001_white_husk.sql`

---

## 6. LLM Integration

The system uses an **OpenAI-compatible API** for all AI-powered features.

### Usage Points

| Feature | Model Usage | Purpose |
|---------|-------------|---------|
| Supervisor Chat | Full conversation | Task analysis & routing |
| Agent Chat | Agent-specific context | Specialized responses |
| Tool Execution | Single-shot | Simulated tool output |

### Message Flow

```
┌─────────────────────────────────────────────────┐
│              LLM Request Pipeline                │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Build System Prompt                         │
│     ├── Default supervisor prompt               │
│     ├── OR custom user prompt (from DB)         │
│     └── OR agent-specific prompt                │
│                                                 │
│  2. Load Conversation History (last 10 msgs)    │
│     └── From messages table (user + assistant)  │
│                                                 │
│  3. Append Current User Message                 │
│                                                 │
│  4. Call invokeLLM()                            │
│     ├── model: auto-selected                    │
│     ├── messages: [system, ...history, user]    │
│     └── response: assistant content             │
│                                                 │
│  5. Post-Processing                             │
│     ├── Save assistant message to DB            │
│     ├── Detect agent mentions (supervisor only) │
│     └── Create tasks for mentioned agents       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Structured Output Support

The LLM helper supports:
- Standard chat completions
- JSON Schema structured outputs
- Tool/function calling
- Thinking/reasoning modes (Claude, GPT-5, Gemini)
- Streaming responses

### Code Location
- LLM Helper: `server/_core/llm.ts`
- Chat Integration: `server/routers.ts` → `chat.sendMessage`
- Tool Simulation: `server/routers.ts` → `toolbox.executeTool`

---

## 7. Communication Flow (tRPC)

The system uses **tRPC** for type-safe client-server communication with real-time polling.

### Request Flow

```
┌─────────────┐    HTTP/tRPC     ┌─────────────┐    Drizzle     ┌─────────┐
│   React UI  │ ◄──────────────► │  Express +  │ ◄────────────► │  MySQL  │
│   (Client)  │                  │   tRPC      │                │  (TiDB) │
└─────────────┘                  └──────┬──────┘                └─────────┘
                                        │
                                        │  HTTP POST
                                        ▼
                                 ┌─────────────┐
                                 │  LLM API    │
                                 │  (OpenAI)   │
                                 └─────────────┘
```

### API Endpoints (tRPC Procedures)

```
appRouter
├── auth
│   ├── me          (query)    → Get current user
│   └── logout      (mutation) → Clear session
│
├── agents
│   ├── list        (query)    → All agents with status
│   ├── get         (query)    → Single agent by slug
│   └── updateStatus(mutation) → Change agent state
│
├── chat
│   ├── getMessages (query)    → Message history per agent
│   └── sendMessage (mutation) → Send + get LLM response
│
├── tasks
│   ├── getAll      (query)    → All active tasks
│   ├── getByAgent  (query)    → Tasks for specific agent
│   ├── create      (mutation) → Create new task
│   └── updateStatus(mutation) → Update task status/result
│
├── supervisorConfig
│   ├── get         (query)    → Get user's config
│   └── save        (mutation) → Save prompt & rules
│
└── toolbox
    ├── getTools    (query)    → Categorized tool list
    └── executeTool (mutation) → Run tool via LLM
```

### Real-Time Updates (Polling)

Instead of WebSockets, the system uses **intelligent polling** for live updates:

```
┌─────────────────────────────────────────────────┐
│            Polling Strategy                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Agent Status:  refetchInterval = 5000ms        │
│  Task Queue:    refetchInterval = 5000ms        │
│  Chat Messages: on-demand (after send)          │
│  Toolbox:       on-demand (after execute)       │
│                                                 │
│  Benefits:                                      │
│  • No WebSocket complexity                      │
│  • Works behind any proxy/CDN                   │
│  • Automatic reconnection                       │
│  • TanStack Query deduplication                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Code Location
- Client: `client/src/lib/trpc.ts`
- Server: `server/routers.ts`
- Context: `server/_core/context.ts`
- tRPC Init: `server/_core/trpc.ts`

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Authentication | Automatic local owner session |
| Authorization | `protectedProcedure` guards all mutations |
| Data Isolation | User-scoped queries (userId filter) |
| Input Validation | Zod schemas on all inputs |
| XSS Prevention | React auto-escaping + Streamdown |
| CSRF | Not applicable to the local desktop runtime |

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Cloud Run (Node.js)           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Express Server (port dynamic)  │    │
│  │  ├── /api/trpc/*  (tRPC)       │    │
│  │  └── /*           (Vite/Static)│    │
│  └─────────────────────────────────┘    │
│                                         │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  MySQL   │ │  LLM API │ │    S3    │
│  (TiDB)  │ │ (OpenAI) │ │ Storage  │
└──────────┘ └──────────┘ └──────────┘
```

### Runtime Constraints
- **1 vCPU, 512 MiB RAM** (Cloud Run)
- **180s request timeout**
- **Min instances = 0** (cold starts possible)
- **Node.js only** (no Python/Go binaries)
