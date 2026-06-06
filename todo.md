# Pegasus OS - Project TODO

## Core Infrastructure
- [x] Database schema for agents, messages, tasks, supervisor_config
- [x] Backend routers for agent management, chat, tasks, and toolbox
- [x] LLM integration for Supervisor intelligence

## Frontend - Layout & Theme
- [x] Dark Cyberpunk theme with neon green/blue colors
- [x] Main layout with Sidebar + Chat + Dock structure
- [x] Google Font (JetBrains Mono / Space Grotesk) for cyberpunk feel

## Supervisor Chat
- [x] Main chat interface for Supervisor
- [x] LLM-powered task distribution to agents
- [x] Message history with markdown rendering
- [x] Polling-based status updates from agents (5s refetchInterval)

## Agent Manager Sidebar
- [x] List all agents (Recon, Research, Analysis, Exploitation, Web, OSINT)
- [x] Visual status indicators (active/idle/busy/error) for each agent
- [x] Click to open individual agent chat
- [x] Agent activity pulse animation

## Independent Agent Chat
- [x] Separate chat interface per agent
- [x] Independent message history per agent
- [x] Agent-specific tools display
- [x] Direct communication with individual agents

## Toolbox Panel
- [x] Categorized tools display (Recon, Exploitation, Wireless, Web, OSINT)
- [x] Tool execution with user-provided parameters
- [x] Tool results display
- [x] Tool output panel

## Agent Dock (Bottom Bar)
- [x] Agent activity display at bottom
- [x] Task queue per agent
- [x] Agent status indicators with animations
- [x] Auto-polling for live updates (5s refetchInterval)

## Supervisor Prompt System
- [x] Customizable system prompt editor
- [x] Save/load prompt configurations
- [x] Default prompt with routing rules
- [x] Multiple prompt templates (Default, Stealth, Full Assault, Web Focus, OSINT)

## Real Tool Execution Layer

- [x] Create Tool Registry system (server/tools/registry.ts)
- [x] Create base ToolAdapter interface/abstract class
- [x] Build Holehe adapter (email OSINT - Python subprocess)
- [x] Build Sherlock adapter (username OSINT - Python subprocess)
- [x] Build Nmap adapter (port scanning - shell subprocess)
- [x] Build Subfinder adapter (subdomain enumeration - shell subprocess)
- [x] Build Whois adapter (domain lookup - shell subprocess)
- [x] Build Dig/DNSRecon adapter (DNS enumeration - shell subprocess)
- [x] Build Nikto adapter (web vulnerability scanner - shell subprocess)
- [x] Build WhatWeb adapter (web technology fingerprinting - shell subprocess)
- [x] Build TheHarvester adapter (email/domain harvester - Python subprocess)
- [x] Build SQLmap adapter (SQL injection - shell subprocess)
- [x] Build Hydra adapter (brute force - shell subprocess)
- [x] Build Gobuster adapter (directory brute force - shell subprocess)
- [x] Build Nuclei adapter (vulnerability scanning - shell subprocess)
- [x] Build HTTPX adapter (HTTP probing - shell subprocess)
- [x] Build Shodan adapter (API-based via curl)
- [x] Create fallback to LLM simulation when tool not installed
- [x] Modify toolbox.executeTool to use real adapters
- [x] Add tool installation status check endpoint (checkInstalled)
- [x] Update Toolbox UI to show "Real" vs "Simulated" badge
- [x] Dynamic params from registry shown in Toolbox UI
- [x] Execution time tracking
- [x] Installed/Not Installed indicator per tool in UI
- [x] Write vitest tests for tool registry and adapters (29 tests passing)
