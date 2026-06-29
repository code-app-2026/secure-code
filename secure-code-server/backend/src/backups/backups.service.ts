import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(@InjectQueue('system-jobs') private systemJobsQueue: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    this.logger.log('Triggering automated daily backup...');
    await this.systemJobsQueue.add('export-backup', {
      userId: 'system',
      username: 'System Automated',
      triggeredAt: new Date().toISOString(),
    });
  }

  async triggerBackup(userId: string, username: string) {
    this.logger.log(`Manual backup triggered by ${username}`);
    const job = await this.systemJobsQueue.add('export-backup', {
      userId,
      username,
      triggeredAt: new Date().toISOString(),
    });
    return {
      success: true,
      jobId: job.id,
      message: 'Backup job added to queue',
    };
  }

  async getBackupStatus(jobId: string) {
    const job = await this.systemJobsQueue.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };

    const state = await job.getState();
    const progress = job.progress;
    return {
      status: state,
      progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async listBackups() {
    try {
      const backupDir = path.join(process.cwd(), '..', 'backups');
      if (!fs.existsSync(backupDir)) return [];
      
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql.gz') || f.endsWith('.tar.gz'));
      const backups = files.map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: stats.size,
          updatedAt: stats.mtime
        };
      });
      return backups.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      this.logger.error('Failed to list backups', error);
      return [];
    }
  }

  async triggerRestore(userId: string, username: string, filename: string) {
    this.logger.log(`Manual restore triggered by ${username} for file ${filename}`);
    const job = await this.systemJobsQueue.add('restore-backup', {
      userId,
      username,
      filename,
      triggeredAt: new Date().toISOString(),
    });
    return {
      success: true,
      jobId: job.id,
      message: 'Restore job added to queue',
    };
  }

  async deleteBackup(filename: string) {
    try {
      const backupDir = path.join(process.cwd(), '..', 'backups');
      const safeFilename = path.basename(filename);
      const filePath = path.join(backupDir, safeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'Backup deleted' };
      }
      return { success: false, message: 'Backup not found' };
    } catch (error) {
      this.logger.error('Failed to delete backup', error);
      return { success: false, message: 'Failed to delete backup' };
    }
  }
}
