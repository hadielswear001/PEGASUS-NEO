# PEGASUS NEO

**Agentic Security Operating System**

An AI-powered cybersecurity platform that combines a Supervisor AI coordinator with specialized security agents for automated penetration testing, reconnaissance, and vulnerability assessment.

---

## Features

### Supervisor Chat
AI-powered central command that analyzes requests and delegates tasks to specialized agents automatically.

### 6 Specialized Agents
| Agent | Specialty | Tools |
|-------|-----------|-------|
| Recon | Network scanning & enumeration | nmap, shodan, theHarvester |
| Research | Intelligence gathering & correlation | maltego, spiderfoot, recon-ng |
| Analysis | Vulnerability assessment & code review | nikto, wapiti, code_scanner |
| Exploitation | Exploit development & post-exploitation | metasploit, sqlmap, hydra |
| Web | Web app testing & CMS scanning | burpsuite, owasp_zap, xsstrike |
| OSINT | Social media tracking & footprinting | email_harvester, social_hunter |

### Agent Manager Sidebar
Visual overview of all agents with real-time status indicators (active/idle/busy/error).

### Independent Agent Chats
Each agent has its own chat interface with independent conversation history and context.

### Toolbox Panel
29 categorized security tools with parameter inputs and LLM-simulated output.

### Agent Dock
Real-time activity monitor showing live task status for all agents.

### Customizable Supervisor Prompts
5 pre-built templates (Default, Stealth, Full Assault, Web Focus, OSINT) plus custom prompt editor.

---

## Quick Start

```bash
# Clone
git clone <repo-url> pegasus-neo && cd pegasus-neo

# Install
pnpm install

# Configure
cp .env.example .env  # Edit with your credentials

# Database
pnpm drizzle-kit migrate

# Run
pnpm dev
```

Open `http://localhost:3000` in your browser.

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, TypeScript, shadcn/ui
- **Backend:** Express 4, tRPC 11, TypeScript
- **Database:** MySQL/TiDB with Drizzle ORM
- **AI:** OpenAI-compatible LLM API
- **Build:** Vite 7, pnpm
- **Testing:** Vitest

---

## Documentation

| Document | Description |
|----------|-------------|
| [INSTALLATION.md](./INSTALLATION.md) | Full setup and deployment guide |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and data flow |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | File tree and key files |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | Guide for merging into ATTALL |

---

## Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm test       # Run test suite
pnpm check      # TypeScript type checking
```

---

## Theme

Dark Cyberpunk aesthetic with neon green (#00FF88) and blue (#00D4FF) accents. JetBrains Mono font for terminal/hacker feel.

---

## License

MIT
