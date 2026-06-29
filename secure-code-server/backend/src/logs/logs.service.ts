import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityLog } from './entities/security-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

@Injectable()
export class LogsService {
  private lokiLogger: winston.Logger;

  constructor(
    @InjectRepository(SecurityLog)
    private logsRepository: Repository<SecurityLog>,
  ) {
    this.lokiLogger = winston.createLogger({
      transports: [
        new LokiTransport({
          host: process.env.NODE_ENV === 'production' ? 'http://loki:3100' : 'http://localhost:3100',
          labels: { job: 'secure-code-backend' },
          json: true,
          format: winston.format.json(),
          replaceTimestamp: true,
          onConnectionError: (err) => console.error('Loki connection error:', err),
        })
      ]
    });
  }

  async logThreat(data: {
    userId?: string;
    username?: string;
    action: string;
    details: string;
    ipAddress?: string;
  }) {
    // 1. Log to PostgreSQL (Legacy / UI requirement)
    const log = this.logsRepository.create(data);
    const savedLog = await this.logsRepository.save(log);

    // 2. Stream to Grafana Loki
    this.lokiLogger.error({
      message: data.action,
      labels: { severity: 'threat', action: data.action, userId: data.userId || 'system' },
      ...data
    });

    return savedLog;
  }

  // General system-wide audit trailing
  async logEvent(data: {
    userId?: string;
    username?: string;
    action: string;
    details: string;
    ipAddress?: string;
  }) {
    // 1. Log to PostgreSQL (Legacy / UI requirement)
    const log = this.logsRepository.create(data);
    const savedLog = await this.logsRepository.save(log);

    // 2. Stream to Grafana Loki
    this.lokiLogger.info({
      message: data.action,
      labels: { severity: 'info', action: data.action, userId: data.userId || 'system' },
      ...data
    });

    return savedLog;
  }

  async getLogs() {
    return await this.logsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async deleteLog(id: string) {
    return await this.logsRepository.delete(id);
  }

  async deleteAllLogs() {
    return await this.logsRepository.clear();
  }

  async deleteAllSessionsForProject(projectId: string) {
    try {
      const sessionDir = path.join(process.cwd(), '..', 'sessions');
      if (!fs.existsSync(sessionDir)) return { success: true };
      
      const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json') && f.startsWith(`session_${projectId}_`));
      for (const file of files) {
        fs.unlinkSync(path.join(sessionDir, file));
      }
      return { success: true, count: files.length };
    } catch (error) {
      console.error('Failed to delete sessions for project', error);
      return { success: false };
    }
  }

  async saveSessionEvents(
    userId: string,
    username: string,
    projectId: string,
    sessionId: string,
    events: any[],
  ) {
    if (!events || events.length === 0) {
      return { success: true, message: 'No events to save' };
    }

    try {
      const sessionDir = path.join(process.cwd(), '..', 'sessions');
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const fileName = `session_${projectId}_${userId}_${sessionId}.json`;
      const filePath = path.join(sessionDir, fileName);

      let existingEvents: any[] = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          existingEvents = JSON.parse(content);
        } catch (e) {}
      }

      existingEvents.push(...events);
      fs.writeFileSync(filePath, JSON.stringify(existingEvents));
      return { success: true };
    } catch (error) {
      console.error('Failed to save session events', error);
      return { success: false };
    }
  }

  async getSessionsList() {
    try {
      const sessionDir = path.join(process.cwd(), '..', 'sessions');
      if (!fs.existsSync(sessionDir)) return [];
      
      const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
      const sessions = files.map(file => {
        const stats = fs.statSync(path.join(sessionDir, file));
        // Parse filename: session_projectId_userId_sessionId.json (or legacy session_projectId_userId.json)
        const parts = file.replace('.json', '').split('_');
        return {
          filename: file,
          projectId: parts[1] || 'Unknown',
          userId: parts[2] || 'Unknown',
          sessionId: parts[3] || 'Legacy',
          size: stats.size,
          updatedAt: stats.mtime
        };
      });
      return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Failed to list sessions', error);
      return [];
    }
  }

  async getSessionData(filename: string) {
    try {
      // Basic sanitization
      const safeFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), '..', 'sessions', safeFilename);
      
      if (!fs.existsSync(filePath)) {
        return [];
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read session data', error);
      return [];
    }
  }

  async deleteSession(filename: string) {
    try {
      const safeFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), '..', 'sessions', safeFilename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'Session deleted successfully' };
      }
      return { success: false, message: 'Session not found' };
    } catch (error) {
      console.error('Failed to delete session', error);
      return { success: false, message: 'Failed to delete session' };
    }
  }
}
