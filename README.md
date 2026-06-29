# 🛡️ Secure Code Server

**Secure Code Server** is an enterprise-grade, cloud-based IDE platform architected from the ground up to prioritize **Intellectual Property (IP) protection, deep observability, and zero-trust security**. It provides a fully functional collaborative coding environment while enforcing strict, unbreakable guardrails around what developers can access, execute, and extract.

Built to be entirely cloud-agnostic, the platform is fully containerized using Docker, allowing seamless deployment across AWS, Azure, DigitalOcean, or private bare-metal servers.

---

## 🌟 Project Overview

Traditional IDEs give developers full access to source code, risking IP theft, accidental data leaks, and malicious code extraction. **Secure Code Server** solves this by moving the entire development environment to a tightly controlled, browser-based sandbox. 

Developers can write, test, and collaborate on code in real-time, but they cannot steal it. Every keystroke is monitored, every terminal command is evaluated, and every session is recorded.

### 🏗️ Tech Stack
- **Frontend:** Next.js (React), TailwindCSS, Monaco Editor (VS Code engine).
- **Backend:** NestJS, WebSockets, TypeORM.
- **Database & Cache:** PostgreSQL, Redis.
- **Infrastructure:** Docker, Nginx, WireGuard VPN.
- **Observability:** Prometheus, Grafana, Loki (Log Aggregation).
- **Collaboration:** Yjs (CRDT for real-time multiplayer coding).

---

## 🔒 Advanced Security Features

### 1. Data Exfiltration Prevention
- **Anti-Copy/Paste:** Strict OS-level and browser-level interception blocks all copy, cut, and paste attempts, preventing code from leaving the browser window.
- **Dynamic Watermarking:** A permanent, customized UI overlay displays the current user's Username, IP Address, and Timestamp across the screen to deter physical screen recording or photography.
- **Anti-Screenshot Blackout:** Aggressively beats OS-level screen clipping tools (like Windows Snipping Tool) by instantly painting a black `[SECURITY ALERT]` screen over the IDE the millisecond a screenshot hotkey is pressed or the browser loses focus. It forces the user to manually click to dismiss it, ensuring the screen capture only gets a black square, and aggressively wipes the clipboard to destroy snippets.

### 2. Intelligent Terminal Sandboxing
- **Terminal Interceptors:** The built-in IDE terminal does not just pass commands to the OS. It actively intercepts and evaluates every command (like `cd`, `cat`, `rm`, `mv`).
- **Dynamic File Restrictions:** Admins can visually restrict specific files or folders (e.g., locking the `src/` directory). The terminal interceptor instantly detects if a developer attempts to interact with a restricted folder and blocks the command with a `[Security Threat]` alert.

### 3. Identity & Access Management (IAM)
- **Role-Based Access Control (RBAC):** Strict isolation between `Admin`, `Developer`, and `Viewer` roles.
- **IP Whitelisting:** Admins can bind specific developer accounts to fixed IPv4 addresses. Any login attempt from an unauthorized network is forcefully rejected.
- **Session Isolation:** Auth tokens are strictly isolated in `sessionStorage` (preventing multi-tab session bleeding) and coupled with a strict inactivity auto-logout timer.

---

## 👁️ Deep Observability & Auditing

### 1. Visual Session Recording (rrweb)
- The platform secretly records the developer's entire screen session directly from the DOM using `rrweb`. 
- Recordings are streamed to the backend in real-time and available for playback in the Admin Dashboard.
- **Smart Pruning:** To save storage, ultra-short or empty sessions (under 500 KB) are automatically discarded before being saved to the database.

### 2. Comprehensive Audit Trailing
- **Total Visibility:** Every login, file edit, project creation, and blocked terminal threat is tracked with exact timestamps and IP addresses.
- **Grafana Loki:** Logs are concurrently streamed to Grafana Loki for high-performance, horizontally scalable log analysis.

### 3. Server Health & Metrics
- The Admin Dashboard features real-time, SVG-rendered graphs monitoring **CPU, RAM, Network Traffic, and Response Times**.
- Powered by `Prometheus` and `cAdvisor`, gathering exact container-level metrics from the Docker engine.

---

## 🚀 Collaboration & Developer Experience

- **Multiplayer Coding:** Integrated `Yjs` allows multiple developers to open the exact same file and code simultaneously.
- **Live Presence:** Distinct visual cursors display the username and a unique color for every active developer in a file.
- **Live Terminal:** WebSockets provide a low-latency, fully interactive PTY terminal for developers to run builds and test code inside isolated rootless containers.

---

## ⚙️ Deployment & Infrastructure

The platform is designed for a frictionless, single-command deployment to any Linux VPS (Ubuntu 22.04+ recommended). 

### Bundled Services (Docker Compose)
Running `docker-compose up --build -d` instantly orchestrates the entire architecture:
1. **NestJS Backend & Next.js Frontend**
2. **PostgreSQL & Redis**
3. **Nginx Reverse Proxy** (with automatic Certbot SSL renewals)
4. **WireGuard VPN (`wg-easy`)**: Bundled VPN ensures the dashboard can be completely hidden from the public internet, requiring a secure VPN handshake for access.
5. **Prometheus, Grafana, & Loki**: The full observability stack.

### Intelligent Proxying
The frontend architecture utilizes Next.js rewrites to act as an internal reverse proxy (`/api/*`). This completely eliminates CORS issues and dynamically adapts to the host's Public IP Address without manual configuration, making deployments effortlessly portable.

<br />

---

<div align="center">
  <h3><strong>Copy Right &copy; All Rights Reserved Design Sequence LLC</strong></h3>
</div>
