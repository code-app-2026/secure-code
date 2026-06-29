import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
  Patch,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogsService } from '../logs/logs.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly logsService: LogsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.projectsService.findAll();
  }



  @Get('deployments/all')
  async getAllDeployments() {
    return this.projectsService.getAllDeployments();
  }

  @UseGuards(JwtAuthGuard)
  @Get('assigned')
  async findAssigned(@Request() req: any) {
    return this.projectsService.getAssignedProjects(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post(':id/users')
  async assignUser(@Param('id') id: string, @Body('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return this.projectsService.assignUser(id, userId);
  }

  @Post(':id/users/username')
  async assignUserByUsername(
    @Param('id') id: string,
    @Body('username') username: string,
  ) {
    if (!username) throw new BadRequestException('username is required');
    return this.projectsService.assignUserByUsername(id, username);
  }

  @Delete(':id/users/:userId')
  async unassignUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.unassignUser(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body('name') name: string, @Request() req: any) {
    if (!name) throw new BadRequestException('Project name is required');
    const project = await this.projectsService.create(name);

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'CREATE_PROJECT',
        details: `Created new project: ${name}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    return project;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('allowedCommands') allowedCommands?: string[],
    @Body('allowedFiles') allowedFiles?: string[],
    @Body('memberRestrictions') memberRestrictions?: any,
  ) {
    return this.projectsService.update(id, name, allowedCommands, allowedFiles, memberRestrictions);
  }

  @Patch(':id/recalculate-storage')
  async recalculateStorage(@Param('id') id: string) {
    return this.projectsService.recalculateStorage(id);
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file'))
  async importZip(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Zip file is required');
    if (!file.originalname.endsWith('.zip')) {
      throw new BadRequestException('File must be a .zip');
    }

    return this.projectsService.importZip(id, file.buffer);
  }

  @Post(':id/git-pull')
  async pullGitRepository(
    @Param('id') id: string,
    @Body('url') url: string,
    @Body('branch') branch: string | undefined,
    @Res() res: Response,
  ) {
    if (!url) throw new BadRequestException('Git URL is required');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      await this.projectsService.pullGitRepository(id, url, branch, (pct) => {
        res.write(JSON.stringify({ type: 'progress', percentage: pct }) + '\n');
      });
      res.write(JSON.stringify({ type: 'complete' }) + '\n');
      res.end();
    } catch (err: any) {
      res.write(JSON.stringify({ type: 'error', message: err.message }) + '\n');
      res.end();
    }
  }

  @Get(':id/export')
  async exportZip(@Param('id') id: string, @Res() res: Response) {
    await this.projectsService.exportZip(id, res);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.projectsService.remove(id);

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'DELETE_PROJECT',
        details: `Deleted project ID: ${id}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    return { success: true };
  }
}
