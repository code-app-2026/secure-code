import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/enums/role.enum';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async logout(userId: string) {
    await this.usersService.setOnlineStatus(userId, false);
    await this.usersService.updateSessionId(userId, null);
  }

  async login(user: any) {
    await this.usersService.setOnlineStatus(user.id, true);
    const sessionId = randomUUID();
    await this.usersService.updateSessionId(user.id, sessionId);
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      status: user.status,
      sessionId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      role: user.role,
    };
  }

  async register(username: string, pass: string, role: Role) {
    const user = await this.usersService.create(username, pass, role);
    return this.login(user);
  }

  async verifyBackupCode(username: string, backupCode: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user || user.backupCode !== backupCode) {
      throw new UnauthorizedException('Invalid username or backup code');
    }
    // Return a temporary token for resetting password
    const payload = { sub: user.id, isResetToken: true };
    return {
      resetToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
    };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(resetToken);
      if (!payload.isResetToken || !payload.sub) {
        throw new UnauthorizedException('Invalid token type');
      }
      await this.usersService.updateProfile(payload.sub, {
        newPassword,
        backupCode: 'RECOVERED',
        reactivate: true,
      });
      return { message: 'Password reset successfully', userId: payload.sub };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
