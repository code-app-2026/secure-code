import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { BackupsService } from './backups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listBackups(@Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can list backups');
    }
    return this.backupsService.listBackups();
  }

  @Post('export')
  @UseGuards(JwtAuthGuard)
  async exportBackup(@Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can trigger backups');
    }
    return this.backupsService.triggerBackup(req.user.id, req.user.username);
  }

  @Post('restore')
  @UseGuards(JwtAuthGuard)
  async restoreBackup(@Request() req: any, @Body('filename') filename: string) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can restore backups');
    }
    return this.backupsService.triggerRestore(req.user.id, req.user.username, filename);
  }

  @Get('job/:id')
  @UseGuards(JwtAuthGuard)
  async getJobStatus(@Param('id') jobId: string, @Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can view backup status');
    }
    return this.backupsService.getBackupStatus(jobId);
  }

  @Delete(':filename')
  @UseGuards(JwtAuthGuard)
  async deleteBackup(@Param('filename') filename: string, @Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can delete backups');
    }
    return this.backupsService.deleteBackup(filename);
  }
}
