# Advanced Infrastructure Implementation & Testing Guide

This document outlines the recent advanced infrastructure features that have been implemented (Phases 1-5) and provides step-by-step instructions on how to deploy and test them on your Azure/Oracle VM.

## What Was Implemented

1. **Phase 1: Cache (Redis Cluster)**
   - Integrated `@nestjs/cache-manager` and `cache-manager-redis-yet` in the NestJS backend.
   - Connected the application to the `secure_code_redis` container.
   - Applied a 5-second `CacheInterceptor` on the `/users/stats` endpoint. This significantly reduces the load on PostgreSQL, as the Admin Dashboard constantly polls this endpoint.

2. **Phase 2: Queue (BullMQ)**
   - Integrated `@nestjs/bullmq` with the Redis container.
   - Created a background job queue named `system-jobs` which allows the backend to perform heavy operations without blocking HTTP API requests.

3. **Phase 3: Automated Backup System**
   - Implemented an isolated `BackupsModule` using a strict zero-breakage approach.
   - Built the `BackupsProcessor` which consumes jobs from BullMQ and securely exports your database via `pg_dump` and `gzip`.
   - Scheduled a cron job to automatically trigger a backup every day at midnight.
   - Wired the **Export Backup** UI button in the Admin Dashboard to trigger the `/backups/export` endpoint, which delegates the work to BullMQ.

4. **Phase 4: SSL & Firewall**
   - Created `setup-firewall.sh` which enforces a strict UFW policy allowing only SSH (22), HTTP (80), and HTTPS (443).
   - Updated `docker-compose.yml` to include a standalone `certbot` container that automatically wakes up every 12 hours and renews your Let's Encrypt certificates using the shared `/var/www/certbot` volume.

5. **Phase 5: Session Recording**
   - Installed `rrweb` on the Next.js frontend to securely log keystrokes, DOM mutations, and interactions within the IDE workspace.
   - Added a background emitter that chunks recorded events every 100 updates and silently pushes them to the new `/logs/session` backend endpoint.
   - Configured `LogsService` to securely append these session events into local `.json` chunk files mapped securely on the host VM in the `/sessions` directory.

---

## How to Deploy and Test

To test these features, SSH into your Azure or Oracle VM and follow these steps. **Everything is configured so that you just pull the code and run docker-compose.**

### 1. Update and Rebuild

Pull the latest code, install any potential new dependencies (if testing locally instead of Docker), and rebuild the Docker cluster:

```bash
cd ~/secure-code/secure-code-server
git pull origin main

# Stop existing containers
sudo docker-compose down

# Rebuild and start everything in the background
sudo docker-compose up --build -d
```

### 2. Verify Redis Cache & Queue

To verify that Redis caching and BullMQ are fully functional:

```bash
sudo docker-compose logs -f backend
```
- Open the Admin Dashboard in your browser.
- You should see the backend logs initializing `system-jobs` (BullMQ).
- You will notice that requests to `/users/stats` are incredibly fast and don't repeatedly spam the DB queries in the log because the Redis Cache intercepts them.

### 3. Verify Backup System

To verify that the backup export system and BullMQ work together:

1. Open the Admin Dashboard in your browser.
2. Click the **Export Backup** button in the lower section of the dashboard.
3. You will see an alert with a Job ID confirming the backup is processing in the background.
4. On your VM terminal, verify that the backup was created:
```bash
ls -la ~/secure-code/secure-code-server/backups
# You should see a file named backup-YYYY-MM-DDTHH-mm-ss.sql.gz
```

### 4. Verify Session Recording (rrweb)

To verify that IDE sessions are being silently recorded:

1. Open the Developer IDE workspace in your browser and type some code, click around, or open a few files (triggering over 100 DOM events).
2. On your VM terminal, verify that the session chunks are being stored:
```bash
ls -la ~/secure-code/secure-code-server/sessions
# You should see session_PROJECTID_USERID.json files being generated and growing in size.
```

### 5. Verify Firewall Security

To lock down the VM and ensure only secure ports are open:

```bash
# Run the firewall setup script
sudo bash setup-firewall.sh

# Verify the UFW status
sudo ufw status verbose
```
You should see that only ports `22`, `80`, and `443` are allowed. All other external traffic is blocked.

---

### Fixing the Local IDE Errors
The red squiggly lines you were seeing in `backups.module.ts`, `IDEWorkspace.tsx`, and `logs.service.ts` in your VSCode are now completely resolved in the codebase. However, your local VSCode IDE needs the new NPM packages to remove the red underlines locally. 

Run this in your local terminal:
```bash
cd backend && npm install
cd ../frontend && npm install
```
