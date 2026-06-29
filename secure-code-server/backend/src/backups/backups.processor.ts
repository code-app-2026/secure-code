import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { LogsService } from '../logs/logs.service';

const execAsync = promisify(exec);

@Processor('system-jobs')
export class BackupsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupsProcessor.name);

  constructor(private readonly logsService: LogsService) {
    super();
  }

  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    if (job.name === 'export-backup') {
      return this.handleExportBackup(job);
    }
    if (job.name === 'restore-backup') {
      return this.handleRestoreBackup(job);
    }
    return { success: false, message: 'Unknown job name' };
  }

  private async handleExportBackup(job: Job): Promise<any> {
    this.logger.log(`Starting backup export job ${job.id}`);

    try {
      const backupDir = path.join(process.cwd(), '..', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.tar.gz`;
      const filePath = path.join(backupDir, filename);

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error('DATABASE_URL is not set');

      // pg_dump (libpq) does not support the ?schema=public query parameter used by TypeORM/Prisma
      const cleanDbUrl = dbUrl.replace('?schema=public', '');

      await job.updateProgress(10);

      // Step 1: Dump database to a temporary file
      const tempDbPath = path.join('/tmp', `db-${timestamp}.sql`);
      const dumpCommand = `pg_dump --clean "${cleanDbUrl}" > "${tempDbPath}"`;
      try {
        await execAsync(dumpCommand);
      } catch (err: any) {
        this.logger.error(`pg_dump failed: ${err.message}`, err.stderr);
        throw new Error(`pg_dump failed: ${err.message || err}`);
      }
      
      await job.updateProgress(50);

      // Step 2: Tar the DB, the physical workspaces directory, and the sessions directory
      const sessionDir = path.join(process.cwd(), '..', 'sessions');
      // We will tar the DB from /tmp, workspaces from /, and sessions from the sessionDir's parent directory
      const tarCommand = `tar -czf "${filePath}" -C /tmp "db-${timestamp}.sql" -C / workspaces -C "${path.join(process.cwd(), '..')}" sessions`;
      try {
        await execAsync(tarCommand);
      } catch (err: any) {
        this.logger.error(`tar failed: ${err.message}`, err.stderr);
        throw new Error(`tar failed: ${err.message || err}`);
      }

      // Cleanup temp db
      fs.unlinkSync(tempDbPath);

      await job.updateProgress(100);

      if (job.data.userId) {
        await this.logsService.logEvent({
          userId: job.data.userId,
          username: job.data.username || 'System',
          action: 'BACKUP_EXPORT',
          details: `Exported full backup to ${filename}`,
          ipAddress: 'Server',
        });
      }

      this.logger.log(`Backup completed: ${filename}`);
      return { success: true, file: filename };
    } catch (error: any) {
      this.logger.error(`Backup failed: ${error.message}`);
      throw error;
    }
  }

  private async handleRestoreBackup(job: Job): Promise<any> {
    this.logger.log(`Starting backup restore job ${job.id}`);
    try {
      const filename = job.data.filename;
      if (!filename) throw new Error('No filename provided for restore');

      const backupDir = path.join(process.cwd(), '..', 'backups');
      const filePath = path.join(backupDir, filename);

      if (!fs.existsSync(filePath)) throw new Error(`Backup file ${filename} not found`);

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error('DATABASE_URL is not set');
      
      // pg_dump/psql (libpq) does not support the ?schema=public query parameter used by TypeORM/Prisma
      const cleanDbUrl = dbUrl.replace('?schema=public', '');

      await job.updateProgress(10);

      const extractDir = path.join('/tmp', `restore-${job.id}`);
      fs.mkdirSync(extractDir, { recursive: true });

      // Step 1: Extract Tarball
      const extractCommand = `tar -xzf "${filePath}" -C "${extractDir}"`;
      try {
        await execAsync(extractCommand);
      } catch (err: any) {
        this.logger.error(`tar extraction failed: ${err.message}`, err.stderr);
        throw new Error(`tar extraction failed: ${err.message || err}`);
      }

      await job.updateProgress(40);

      // Step 2: Restore Database (Full Overwrite using the --clean dump)
      // The sql file will be named db-TIMESTAMP.sql. We find it dynamically:
      const extractedFiles = fs.readdirSync(extractDir);
      const sqlFile = extractedFiles.find(f => f.endsWith('.sql'));
      
      if (!sqlFile) throw new Error('No SQL dump found in backup archive');

      const restoreCommand = `psql "${dbUrl}" < "${path.join(extractDir, sqlFile)}"`;
      await execAsync(restoreCommand);

      await job.updateProgress(70);

      // Step 3: Differential File Restore (No Clobber)
      // We copy extracted workspace files into the live workspace, but DO NOT overwrite existing files.
      // -n means no-clobber
      const workspaceExtractPath = path.join(extractDir, 'workspaces');
      if (fs.existsSync(workspaceExtractPath)) {
        const copyCommand = `cp -rn "${workspaceExtractPath}/"* /workspaces/ || true`;
        await execAsync(copyCommand);
      }

      const sessionsExtractPath = path.join(extractDir, 'sessions');
      if (fs.existsSync(sessionsExtractPath)) {
        const liveSessionsDir = path.join(process.cwd(), '..', 'sessions');
        if (!fs.existsSync(liveSessionsDir)) fs.mkdirSync(liveSessionsDir, { recursive: true });
        const copySessionsCommand = `cp -rn "${sessionsExtractPath}/"* "${liveSessionsDir}/" || true`;
        await execAsync(copySessionsCommand);
      }

      await job.updateProgress(90);

      // Cleanup
      const rmCommand = `rm -rf "${extractDir}"`;
      await execAsync(rmCommand);

      await job.updateProgress(100);

      if (job.data.userId) {
        await this.logsService.logEvent({
          userId: job.data.userId,
          username: job.data.username || 'System',
          action: 'BACKUP_RESTORE',
          details: `Restored full backup from ${filename}`,
          ipAddress: 'Server',
        });
      }

      this.logger.log(`Restore completed: ${filename}`);
      return { success: true, file: filename };
    } catch (error: any) {
      this.logger.error(`Restore failed: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} has completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} has failed: ${error.message}`);
  }
}
