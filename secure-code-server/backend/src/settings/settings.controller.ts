import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogsService } from '../logs/logs.service';
import { Role } from '../users/enums/role.enum';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly logsService: LogsService,
  ) {}

  @Get('public')
  async getPublicSettings() {
    const maintenanceMode = await this.settingsService.getSetting(
      'maintenanceMode',
      false,
    );
    const systemMessage = await this.settingsService.getSetting(
      'systemMessage',
      '',
    );
    const showSystemMessage = await this.settingsService.getSetting(
      'showSystemMessage',
      false,
    );
    return { maintenanceMode, systemMessage, showSystemMessage };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSettings(@Request() req: any) {
    // Only Admin can view settings
    if (req.user.role !== Role.Admin) {
      throw new UnauthorizedException('Only Admins can view settings');
    }
    return this.settingsService.getAllSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateSettings(@Request() req: any, @Body() body: any) {
    if (req.user.role !== Role.Admin) {
      throw new UnauthorizedException('Only Admins can modify settings');
    }

    const updated = await this.settingsService.updateMultiple(body);

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'UPDATE_SETTINGS',
        details: `Updated system settings: ${Object.keys(body).join(', ')}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @Post('clear-storage')
  async clearStorage(@Request() req: any) {
    if (req.user.role !== Role.Admin) {
      throw new UnauthorizedException('Only Admins can clear storage');
    }

    try {
      // Prune system (stopped containers, unused networks, all unused images)
      await execAsync('docker system prune -a -f');
      // Prune build cache
      await execAsync('docker builder prune -a -f');

      this.logsService
        .logEvent({
          userId: req.user.id,
          username: req.user.username,
          action: 'CLEAR_STORAGE',
          details: 'Cleared unused Docker cache, images, and stopped containers',
          ipAddress:
            req.headers['x-forwarded-for'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress,
        })
        .catch((e) => console.error(e));

      return { success: true, message: 'Storage cleared successfully' };
    } catch (error: any) {
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }
}
