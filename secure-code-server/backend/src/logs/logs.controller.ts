import {
  Controller,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
  Delete,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) { }

  @Get()
  async getLogs(@Request() req: any) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can view security logs.');
    }
    return this.logsService.getLogs();
  }

  @Delete('all')
  async deleteAllLogs(@Request() req: any) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can delete security logs.');
    }
    return this.logsService.deleteAllLogs();
  }

  @Delete('sessions/project/:projectId')
  async deleteAllProjectSessions(@Request() req: any, @Param('projectId') projectId: string) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can delete sessions.');
    }
    return this.logsService.deleteAllSessionsForProject(projectId);
  }

  @Delete(':id')
  async deleteLog(@Request() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can delete security logs.');
    }
    return this.logsService.deleteLog(id);
  }

  @Post('session')
  async saveSessionEvents(@Request() req: any, @Body() body: any) {
    if (body.reason) {
      await this.logsService.logThreat({
        userId: req.user.id,
        username: req.user.username,
        action: 'SESSION_TRIGGER',
        details: body.reason,
        ipAddress: req.ip,
      });
    }

    // Just pass the payload to the service to save it somewhere (e.g. redis or postgres)
    return this.logsService.saveSessionEvents(
      req.user.id,
      req.user.username,
      body.projectId,
      body.sessionId || 'legacy', // Handle legacy frontend if needed
      body.events,
    );
  }

  @Get('sessions')
  async getSessionsList(@Request() req: any) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can view sessions.');
    }
    return this.logsService.getSessionsList();
  }

  @Get('sessions/:filename')
  async getSessionData(@Request() req: any, @Param('filename') filename: string) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can view sessions.');
    }
    return this.logsService.getSessionData(filename);
  }

  @Delete('sessions/:filename')
  async deleteSession(@Request() req: any, @Param('filename') filename: string) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can delete sessions.');
    }
    return this.logsService.deleteSession(filename);
  }
}
