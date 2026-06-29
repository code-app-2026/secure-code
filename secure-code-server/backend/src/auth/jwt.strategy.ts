import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private settingsService: SettingsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret',
    });
  }

  async validate(payload: any) {
    if (payload.isResetToken) {
      return { id: payload.sub, isResetToken: true };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Enforce Single-Device Usage (One-time Session Token)
    if (user.sessionId && user.sessionId !== payload.sessionId) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }

    // Enforce Maintenance Mode for active sessions
    if (user.role !== Role.Admin) {
      const maintenanceMode = await this.settingsService.getSetting(
        'maintenanceMode',
        false,
      );
      if (maintenanceMode) {
        throw new UnauthorizedException('SYSTEM_UNDER_MAINTENANCE');
      }
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      status: payload.status,
    };
  }
}
