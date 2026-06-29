# Browser Secure Code Server

## Progress Tracker

### Day 1-2: Foundation & Backend Setup
- Initialize Monorepo (Next.js frontend, NestJS backend)
- Set up PostgreSQL & Redis (Docker Compose)
- Configure NestJS Database & Redis connections
- Implement basic Role-Based Access Control (RBAC) & Authentication

### Day 3-4: Frontend & Editor Integration
- Implement Figma UI Designs using TailwindCSS
- Backend Connected, PostgreSQL connected, and role based access
- Implemented 15-minute inactivity session timeout with auto logout.
- Integrate Monaco Editor in Next.js
- Set up WebSocket Gateway on NestJS

### Day 5: Browser Security & Restrictions
- Copy/Paste Block (Native OS blocking & Internal Monaco clipboard)
- Watermark Protection (UI Overlay with User Info)
- Advanced Terminal Blacklist (Hardcoded global blocks)

### Advanced Security Hardening (Completed)
- **Session Bleed Fix:** Migrated Auth Tokens to `sessionStorage` preventing multi-tab session bleeding.
- **Enhanced Auto-Logout:** Idle Timer strictly wipes `sessionStorage` alongside cookies.
- **IP Whitelisting:** Admins can enforce specific IPv4 addresses for Developer accounts; logins from unauthorized IPs are forcefully rejected (HTTP 401).
- **Threat Detection Logging:** Integrated a new `SecurityLog` Postgres Entity. When a user runs a blacklisted command in the IDE terminal, the action is blocked and instantly logged to the Admin Dashboard's "Recent Security Threats" panel.

### Day 6: Collaboration & Real-Time Sync
- Integrate Yjs (CRDT) into the Monaco Editor and link it to the existing WebSocket Gateway.
- Implement visual cursors (showing username and unique colors) when multiple developers open the same file.

### Admin Dashboard Enhancements (Completed)
- **Admin System Settings:** Built a dedicated UI (`/admin/system-settings`) backed by a new `SystemSetting` database table to dynamically control global configurations (e.g., Maintenance Mode, Blocked Terminal Regex).
- **Admin Logs & Reports:** Upgraded the security log into a full-scale `AuditLog` trailing system (`/admin/logs`) that precisely tracks who logged in, who created projects, and who updated settings with exact timestamps and IP addresses.
- **Cache:** Redis Cluster (currently relying on memory/Postgres).
- **Queue:** BullMQ (required for background tasks, backups, and heavy executions).
- **Backup System:** Daily automated snapshots and point-in-time recovery mechanisms.
- **SSL & Firewall:** UFW configuration and Nginx certbot routing.
- **Session Recording:** Visual or keystroke recording of active sessions is not implemented.

### Day 7: Infrastructure & Advanced Architecture (Completed)
- **Container Isolation:** Moved from host-execution to spinning up Rootless Docker containers per project/user.
- **Runtime Environment:** Shared Runtime Pool & Rootless Docker Sandboxing (executing safely instead of directly on the host OS).
- **Centralized Logging:** Integrated Grafana Loki alongside Postgres to serve as a high-performance, horizontally scalable log aggregation engine.
- **CI/CD Automation:** Fully automated deployment pipeline using GitHub Actions (`deploy.yml`) with secure SSH runners for continuous integration and delivery.
- **VPN Mandatory Access:** Configuring WireGuard so the dashboard is entirely invisible to the public internet.
- **Deployment & Infrastructure:** Nginx Reverse Proxy, WireGuard VPN, Prometheus+Grafana, Loki logs.