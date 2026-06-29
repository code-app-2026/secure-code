import {
  Controller,
  Patch,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as bcrypt from 'bcrypt';

import { LogsService } from '../logs/logs.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logsService: LogsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: any) {
    const { oldPassword, newUsername, newPassword } = body;
    const userId = req.user.id;

    // Verify old password
    const user = await this.usersService.findByUsername(req.user.username);
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect old password');
    }

    // Update profile
    const updatedUser = await this.usersService.updateProfile(userId, {
      newUsername,
      newPassword,
    });

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'UPDATE_PROFILE',
        details: `User updated their own profile (Username/Password)`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    // Omit password hash from response
    const { passwordHash, ...result } = updatedUser;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('backup-code')
  async getBackupCode(@Request() req: any) {
    const user = await this.usersService.findByUsername(req.user.username);
    if (!user) throw new UnauthorizedException('User not found');
    return { backupCode: user.backupCode || '' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('backup-code')
  async updateBackupCode(@Request() req: any, @Body() body: any) {
    const { backupCode } = body;
    if (backupCode === undefined) {
      throw new UnauthorizedException('Backup code is required');
    }
    await this.usersService.updateBackupCode(req.user.id, backupCode);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-password')
  async verifyPassword(@Request() req: any, @Body() body: any) {
    const { password } = body;
    const user = await this.usersService.findByUsername(req.user.username);
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey('users_stats')
  @CacheTTL(5000) // 5 seconds (cache-manager v6 uses milliseconds for TTL, NestJS might vary, 5000ms is safe)
  @Get('stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('test-projects')
  async testProjects() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Body() body: any, @Request() req: any) {
    const { username, password, role, status, allowIp, publicKey } = body;

    // allowIp is optional. If provided, user can only login from that IP (VPN enforced).
    // If blank or not provided, user can access from any IP (no VPN required).
    const formattedRole = role
      ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
      : undefined;
    const formattedStatus = status
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
      : undefined;
    const newUser = await this.usersService.create(
      username,
      password,
      formattedRole,
      formattedStatus,
      allowIp,
      publicKey,
    );

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'CREATE_USER',
        details: `Created new user: ${username} with role ${formattedRole}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    const { passwordHash, ...result } = newUser;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    await this.usersService.delete(id);

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'DELETE_USER',
        details: `Deleted user ID: ${id}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('ssh-key/public')
  async getSshKey(@Request() req: any) {
    const key = await this.usersService.getSshKey(req.user.id);
    return { publicKey: key };
  }

  @UseGuards(JwtAuthGuard)
  @Post('ssh-key/generate')
  async generateSshKey(@Request() req: any) {
    const newKey = await this.usersService.generateSshKey(req.user.id);
    return { success: true, publicKey: newKey };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const { username, password, role, status, allowIp, publicKey } = body;

    if (allowIp !== undefined && allowIp.trim() === '') {
      throw new BadRequestException('Allowed IP cannot be empty.');
    }

    const updatedUser = await this.usersService.adminUpdateUser(id, {
      username,
      password,
      role,
      status,
      allowIp,
      publicKey,
    });

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'UPDATE_USER',
        details: `Updated user ID: ${id}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}
