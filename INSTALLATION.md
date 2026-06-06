# PEGASUS NEO - Installation Guide

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18.x or higher | Runtime environment |
| pnpm | 8.x or higher | Package manager |
| MySQL/TiDB | 8.x or compatible | Database |
| Git | Any recent | Version control |

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url> pegasus-neo
cd pegasus-neo
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials (see Environment Variables section below).

### 4. Set Up Database

Create your MySQL database, then run the migrations:

```bash
# Generate migration files (if schema changed)
pnpm drizzle-kit generate

# Apply migrations to your database
pnpm drizzle-kit migrate
```

Or manually execute the SQL files in order:
```bash
mysql -u root -p your_database < drizzle/0000_majestic_union_jack.sql
mysql -u root -p your_database < drizzle/0001_white_husk.sql
```

### 5. Seed Default Agents

Run this SQL to populate the 6 default agents:

```sql
INSERT INTO agents (name, slug, description, category, status, systemPrompt, tools) VALUES
('Recon Agent', 'recon', 'Network scanning, port enumeration, and service discovery', 'recon', 'idle', 'You are a Recon Agent specialized in network reconnaissance...', '["nmap","shodan","theHarvester","recon-ng","spiderfoot","metagoofil"]'),
('Research Agent', 'research', 'Deep OSINT, intelligence gathering, and data correlation', 'research', 'idle', 'You are a Research Agent specialized in deep intelligence gathering...', '["maltego","spiderfoot","recon-ng","censys","shodan_monitor"]'),
('Analysis Agent', 'analysis', 'Vulnerability assessment, code review, and risk analysis', 'analysis', 'idle', 'You are an Analysis Agent specialized in vulnerability assessment...', '["nikto","wapiti","code_scanner","dependency_check","ssl_analyzer"]'),
('Exploitation Agent', 'exploitation', 'Exploit development, payload generation, and post-exploitation', 'exploitation', 'idle', 'You are an Exploitation Agent specialized in exploit development...', '["metasploit","sqlmap","hydra","hashcat","john","commix"]'),
('Web Agent', 'web', 'Web application testing, XSS/SQLi detection, and CMS scanning', 'web', 'idle', 'You are a Web Agent specialized in web application penetration testing...', '["burpsuite","owasp_zap","nikto","xsstrike","wpscan","dirbuster"]'),
('OSINT Agent', 'osint', 'Social media tracking, email analysis, and digital footprinting', 'osint', 'idle', 'You are an OSINT Agent specialized in open-source intelligence...', '["maltego","email_harvester","social_hunter","ip_geolocator","phone_tracker","domain_enum"]');
```

### 6. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### 7. Run Tests

```bash
pnpm test
```

---

## Environment Variables

Create a `.env` file in the project root with these variables:

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database_name

# Owner Info
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=your-name

# LLM API (local LM Studio OpenAI-compatible endpoint)
LM_STUDIO_API_BASE=http://127.0.0.1:1234/v1
```

---

## Production Build

### Build for Production

```bash
pnpm build
```

This generates:
- `dist/` - Compiled server code
- `dist/client/` - Static frontend assets

### Start Production Server

```bash
pnpm start
```

Or use the startup scripts:

```bash
# Unix/macOS
chmod +x start.sh
./start.sh

# Windows
start.bat
```

---

## Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t pegasus-neo .
docker run -p 3000:3000 --env-file .env pegasus-neo
```

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `MODULE_NOT_FOUND` | Run `pnpm install` again |
| Database connection failed | Check `DATABASE_URL` format and credentials |
| LLM responses empty | Confirm LM Studio is running at `http://127.0.0.1:1234/v1` |
| Port already in use | Kill process on port 3000 or set `PORT` env |

### Verify Installation

```bash
# Check TypeScript compilation
pnpm check

# Run test suite
pnpm test

# Check database connection
pnpm drizzle-kit studio
```

---

## macOS Desktop App (Electron Wrapper)

To run PEGASUS NEO as a standalone macOS app:

### Option 1: Electron (Recommended)

```bash
# Install Electron globally
npm install -g electron

# Create electron main file
cat > electron-main.js << 'EOF'
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;

app.on('ready', () => {
  // Start the backend server
  serverProcess = spawn('node', ['dist/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: '3000' }
  });

  // Wait for server to start, then open window
  setTimeout(() => {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      title: 'PEGASUS NEO',
      webPreferences: { nodeIntegration: false }
    });
    mainWindow.loadURL('http://localhost:3000');
  }, 3000);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});
EOF

# Run as desktop app
electron .
```

### Option 2: Tauri (Lightweight)

For a smaller binary size, use Tauri instead of Electron. See [tauri.app](https://tauri.app) for setup instructions.
