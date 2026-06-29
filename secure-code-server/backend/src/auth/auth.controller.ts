import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LogsService } from '../logs/logs.service';
import { SettingsService } from '../settings/settings.service';
import { Role } from '../users/enums/role.enum';
import { Status } from '../users/enums/status.enum';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly logsService: LogsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post('login')
  async login(@Body() body: any, @Request() req: any) {
    const { username, password } = body;
    const userRecord = await this.usersService.findByUsername(username);

    if (!userRecord) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Enforce lockouts for all users
    if (userRecord.status === Status.Suspended) {
      if (userRecord.role === Role.Admin) {
        throw new UnauthorizedException(
          'Admin account suspended due to too many failed attempts. Use your Backup Recovery Code to restore access.',
        );
      } else {
        throw new UnauthorizedException(
          'Sorry, you are temporarily suspended by the Admin. Contact admin to activate the account.',
        );
      }
    }
    if (userRecord.status === Status.Blocked) {
      throw new UnauthorizedException(
        'Sorry, you are permanently blocked by the Admin.',
      );
    }
    // Check if currently locked out
    if (userRecord.lockoutUntil && new Date() < userRecord.lockoutUntil) {
      throw new UnauthorizedException({
        message: 'Account locked due to too many failed attempts.',
        lockoutUntil: userRecord.lockoutUntil.toISOString(),
      });
    }

    const user = await this.authService.validateUser(username, password);
    if (!user) {
      // Handle failed attempt for all users
      userRecord.failedLoginAttempts += 1;
      
      if (userRecord.failedLoginAttempts >= 9) {
        userRecord.status = Status.Suspended;
        userRecord.failedLoginAttempts = 0;
        userRecord.lockoutUntil = null;
        await this.usersService.saveUser(userRecord);
        if (userRecord.role === Role.Admin) {
          throw new UnauthorizedException(
            'Admin account suspended due to too many failed attempts. Use your Backup Recovery Code to restore access.',
          );
        } else {
          throw new UnauthorizedException(
            'Sorry, you are temporarily suspended by the Admin. Contact admin to activate the account.',
          );
        }
      } else if (userRecord.failedLoginAttempts === 6) {
        userRecord.lockoutUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await this.usersService.saveUser(userRecord);
        throw new UnauthorizedException({
          message: 'Account locked due to too many failed attempts.',
          lockoutUntil: userRecord.lockoutUntil.toISOString(),
        });
      } else if (userRecord.failedLoginAttempts === 3) {
        userRecord.lockoutUntil = new Date(Date.now() + 3 * 60 * 1000); // 3 mins
        await this.usersService.saveUser(userRecord);
        throw new UnauthorizedException({
          message: 'Account locked due to too many failed attempts.',
          lockoutUntil: userRecord.lockoutUntil.toISOString(),
        });
      } else {
        await this.usersService.saveUser(userRecord);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Success - reset attempts
    if (userRecord.failedLoginAttempts > 0) {
      await this.usersService.resetFailedAttempts(userRecord.id);
    }

    const maintenanceMode = await this.settingsService.getSetting(
      'maintenanceMode',
      false,
    );
    if (maintenanceMode && user.role !== Role.Admin) {
      this.logsService
        .logEvent({
          userId: user.id,
          username: user.username,
          action: 'BLOCKED_LOGIN_MAINTENANCE',
          details: 'Attempted to log in during maintenance mode.',
          ipAddress:
            req.headers['x-forwarded-for'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            'unknown',
        })
        .catch((e) => console.error('Failed to log event:', e));
      throw new UnauthorizedException(
        'System is currently in maintenance mode. Only Admins can log in.',
      );
    }

    // IP Whitelisting Enforcement
    let clientIp =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
    if (typeof clientIp === 'string') {
      clientIp = clientIp.split(',')[0].trim();
    }

    // IP Whitelisting Enforcement (Temporarily Disabled for Cloudflare Tunnel)
    /*
    if (user.allowIp && user.allowIp.trim() !== '') {
      // Simple string match for MVP. In production, CIDR matching might be needed.
      if (clientIp !== user.allowIp.trim()) {
        this.logsService
          .logThreat({
            userId: user.id,
            username: user.username,
            action: 'BLOCKED_IP_LOGIN',
            details: `Attempted to log in from unauthorized IP address: ${clientIp} (Expected: ${user.allowIp.trim()})`,
            ipAddress: clientIp,
          })
          .catch((e) => console.error('Failed to log threat:', e));

        throw new UnauthorizedException('Access denied from this IP address.');
      }
    }
    */

    this.logsService
      .logEvent({
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        details: 'User logged in successfully.',
        ipAddress: clientIp,
      })
      .catch((e) => console.error('Failed to log event:', e));

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any) {
    if (req.user && req.user.id) {
      await this.authService.logout(req.user.id);
      
      let clientIp =
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
      if (typeof clientIp === 'string') {
        clientIp = clientIp.split(',')[0].trim();
      }

      this.logsService
        .logEvent({
          userId: req.user.id,
          username: req.user.username,
          action: 'LOGOUT',
          details: 'User logged out successfully.',
          ipAddress: clientIp,
        })
        .catch((e) => console.error('Failed to log event:', e));
    }
    return { message: 'Logged out successfully' };
  }

  // Heartbeat: called every 5 minutes by the frontend to keep lastActive fresh
  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  async heartbeat(@Request() req: any) {
    if (req.user && req.user.id) {
      await this.usersService.setOnlineStatus(req.user.id, true);
    }
    return { ok: true };
  }

  @Post('verify-backup-code')
  async verifyBackupCode(@Body() body: any) {
    const { username, backupCode } = body;
    if (!username || !backupCode) {
      throw new UnauthorizedException('Username and backup code are required');
    }
    return this.authService.verifyBackupCode(username, backupCode);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any, @Request() req: any) {
    const { resetToken, newPassword } = body;
    if (!resetToken || !newPassword) {
      throw new UnauthorizedException(
        'Reset token and new password are required',
      );
    }
    const result = await this.authService.resetPassword(resetToken, newPassword);

    let clientIp =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
    if (typeof clientIp === 'string') {
      clientIp = clientIp.split(',')[0].trim();
    }

    if (result.userId) {
      this.logsService
        .logEvent({
          userId: result.userId,
          username: 'System (Recovery)',
          action: 'PASSWORD_RESET',
          details: 'User successfully reset their password using a backup code.',
          ipAddress: clientIp,
        })
        .catch((e) => console.error('Failed to log event:', e));
    }

    return { message: result.message };
  }
}
