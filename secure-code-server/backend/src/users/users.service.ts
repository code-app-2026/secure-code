import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from './enums/role.enum';
import { Status } from './enums/status.enum';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedUsers();
  }

  private async seedUsers() {
    const roles = [Role.Admin];
    for (const role of roles) {
      const username = role.toLowerCase();
      const existing = await this.findByUsername(username);
      if (!existing) {
        // Provide a default password and backup code for the admin
        const password = role === Role.Admin ? 'Admin@123' : username;
        await this.create(
          username,
          password,
          role,
          Status.Active,
          undefined,
          undefined,
          null,
        );
        console.log(`[Seed] Seeded default user: ${username}`);
      } else if (!existing.backupCode && username === 'admin') {
        existing.backupCode = null;
        await this.usersRepository.save(existing);
        console.log(`[Seed] Updated existing admin user to clear backup code`);
      }
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async cleanupStaleOnlineUsers() {
    const staleThreshold = new Date(Date.now() - 3 * 60 * 1000);
    await this.usersRepository
      .createQueryBuilder()
      .update()
      .set({ isOnline: false })
      .where('isOnline = true AND (lastActive IS NULL OR lastActive < :threshold)', { threshold: staleThreshold })
      .execute();
  }

  async findAll(): Promise<User[]> {
    await this.cleanupStaleOnlineUsers();

    const users = await this.usersRepository.find({
      relations: { projects: true },
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => {
      const { passwordHash, ...rest } = user;
      return rest as User;
    });
  }

  async updateSessionId(
    userId: string,
    sessionId: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { sessionId });
  }

  async create(
    username: string,
    passwordPlain: string,
    roleInput: string = Role.Viewer,
    statusInput: string = Status.Active,
    allowIp?: string,
    publicKey?: string,
    backupCode?: string | null,
  ): Promise<User> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    if (allowIp) {
      const ipExists = await this.usersRepository.findOne({ where: { allowIp } });
      if (ipExists) {
        throw new ConflictException('IP already taken');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    const roleString =
      roleInput.trim().charAt(0).toUpperCase() +
      roleInput.trim().slice(1).toLowerCase();
    let role = Role.Viewer;
    if (Object.values(Role).includes(roleString as Role)) {
      role = roleString as Role;
    }

    const statusString =
      statusInput.trim().charAt(0).toUpperCase() +
      statusInput.trim().slice(1).toLowerCase();
    let status = Status.Active;
    if (Object.values(Status).includes(statusString as Status)) {
      status = statusString as Status;
    }

    const newUser = this.usersRepository.create({
      username,
      passwordHash,
      passwordLength: passwordPlain.length,
      role,
      status,
      allowIp,
      publicKey,
      backupCode: backupCode || null,
    });
    return this.usersRepository.save(newUser);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    if (user.username === 'admin') {
      throw new ConflictException('The master admin user cannot be deleted.');
    }
    try {
      const result = await this.usersRepository.delete(id);
      if (result.affected === 0) {
        throw new Error('User not found');
      }
    } catch (err: any) {
      if (
        err.code === '23503' ||
        err.message.includes('foreign key constraint')
      ) {
        throw new ConflictException(
          'This user is currently assigned to one or more projects. Please unassign them from all projects before deleting.',
        );
      }
      throw err;
    }
  }

  async getSshKey(id: string): Promise<string | null> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    return user.publicKey || null;
  }

  async generateSshKey(id: string): Promise<string> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    const sshDir = path.join(workspacesDir, '.ssh');
    const privateKeyPath = path.join(sshDir, 'id_ed25519');
    const publicKeyPath = path.join(sshDir, 'id_ed25519.pub');
    const knownHostsPath = path.join(sshDir, 'known_hosts');

    // Ensure .ssh directory exists
    if (!fs.existsSync(sshDir)) {
      await fs.promises.mkdir(sshDir, { recursive: true, mode: 0o700 });
    }

    // Remove existing keys to generate new ones safely
    if (fs.existsSync(privateKeyPath)) await fs.promises.unlink(privateKeyPath);
    if (fs.existsSync(publicKeyPath)) await fs.promises.unlink(publicKeyPath);

    // Generate extremely short, highly secure Ed25519 SSH key without a passphrase
    await execAsync(
      `ssh-keygen -t ed25519 -f "${privateKeyPath}" -N "" -q -C "${user.username}@securecode.local"`,
    );

    // Fetch popular host keys to prevent strict host key checking from blocking git pulls/pushes
    // Fetch popular host keys to prevent strict host key checking from blocking git pulls/pushes
    try {
      await execAsync(
        `ssh-keyscan -t rsa github.com gitlab.com bitbucket.org >> "${knownHostsPath}"`,
      );
    } catch (e) {
      console.error('Failed to update known_hosts', e);
    }

    // Read the generated public key
    const publicKeyContent = await fs.promises.readFile(publicKeyPath, 'utf8');

    // Save to database
    user.publicKey = publicKeyContent.trim();
    await this.usersRepository.save(user);

    return user.publicKey;
  }

  async updateProfile(
    userId: string,
    updates: {
      newUsername?: string;
      newPassword?: string;
      backupCode?: string | null;
      reactivate?: boolean;
    },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (updates.newUsername) {
      const existing = await this.findByUsername(updates.newUsername);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
      user.username = updates.newUsername;
    }

    if (updates.newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(updates.newPassword, salt);
      user.passwordLength = updates.newPassword.length;
    }
    if (updates.backupCode !== undefined) {
      user.backupCode = updates.backupCode; // can be null or 'RECOVERED'
    }
    if (updates.reactivate) {
      user.status = Status.Active;
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
    }

    return this.usersRepository.save(user);
  }

  async updateBackupCode(userId: string, newBackupCode: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.backupCode = newBackupCode;
    return this.usersRepository.save(user);
  }

  async adminUpdateUser(
    id: string,
    updates: {
      username?: string;
      password?: string;
      role?: string;
      status?: string;
      allowIp?: string;
      publicKey?: string;
    },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new Error('User not found');

    if (updates.username) {
      const existing = await this.findByUsername(updates.username);
      if (existing && existing.id !== id) {
        throw new ConflictException('Username already taken');
      }
      user.username = updates.username;
    }

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(updates.password, salt);
      user.passwordLength = updates.password.length;
    }

    if (updates.role) {
      const roleString =
        updates.role.charAt(0).toUpperCase() +
        updates.role.slice(1).toLowerCase();
      if (Object.values(Role).includes(roleString as Role)) {
        user.role = roleString as Role;
      }
    }

    if (updates.status) {
      const statusString =
        updates.status.charAt(0).toUpperCase() +
        updates.status.slice(1).toLowerCase();
      if (Object.values(Status).includes(statusString as Status)) {
        user.status = statusString as Status;
      }
    }

    if (updates.allowIp !== undefined) {
      const ipExists = await this.usersRepository.findOne({ where: { allowIp: updates.allowIp } });
      if (ipExists && ipExists.id !== id) {
        throw new ConflictException('IP already taken');
      }
      user.allowIp = updates.allowIp;
    }
    if (updates.publicKey !== undefined) user.publicKey = updates.publicKey;

    return this.usersRepository.save(user);
  }

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.isOnline = isOnline;
      user.lastActive = new Date();
      await this.usersRepository.save(user);
    }
  }

  async saveUser(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });
  }

  async getStats() {
    const qb = this.usersRepository.createQueryBuilder('user');
    qb.select('user.role', 'role');
    qb.addSelect('COUNT(user.id)', 'count');
    qb.groupBy('user.role');

    const results = await qb.getRawMany();

    // Reduce array into an object: { admin: 1, developer: 1, viewer: 1 }
    const roleCounts = results.reduce(
      (acc, curr) => {
        const normalizedRole = curr.role ? curr.role.toLowerCase() : '';
        if (normalizedRole) acc[normalizedRole] = parseInt(curr.count, 10);
        return acc;
      },
      { admin: 0, developer: 0, viewer: 0 },
    );

    // Auto-reset stale online flags
    await this.cleanupStaleOnlineUsers();

    const onlineCount = await this.usersRepository.count({
      where: { isOnline: true },
    });

    return {
      roles: roleCounts,
      online: onlineCount,
    };
  }
}
