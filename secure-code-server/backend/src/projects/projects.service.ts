import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Deployment } from './entities/deployment.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { ZipArchive } from 'archiver';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

import { UsersService } from '../users/users.service';
import { TerminalGateway } from '../editor/terminal.gateway';
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Deployment)
    private deploymentsRepository: Repository<Deployment>,
    private usersService: UsersService,
  ) {}

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id }, relations: { users: true } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findAll(): Promise<any[]> {
    const projects = await this.projectsRepository.find({
      relations: { users: true },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      projects.map(async (p) => {
        const pMap = TerminalGateway.projectSessions.get(p.id);

        const latestDeployment = await this.deploymentsRepository.findOne({
          where: { projectId: p.id },
          order: { createdAt: 'DESC' },
        });

        return {
          ...p,
          status: 'Running',
          onlineUsers: pMap ? pMap.size : 0,
          lastDeploy: latestDeployment ? latestDeployment.createdAt : null,
        };
      }),
    );
  }

  async createDeployment(
    projectId: string,
    userId: string,
    commitMessage: string,
    env: string = 'Production',
    status: string = 'Success',
  ) {
    const deployment = this.deploymentsRepository.create({
      projectId,
      userId,
      commitMessage,
      environment: env,
      status,
    });
    return await this.deploymentsRepository.save(deployment);
  }

  async getAllDeployments(): Promise<Deployment[]> {
    return await this.deploymentsRepository.find({
      relations: { project: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(name: string): Promise<Project> {
    const project = this.projectsRepository.create({ name, users: [] });
    await this.projectsRepository.save(project);
    return project;
  }

  async update(
    id: string,
    newName?: string,
    allowedCommands?: string[],
    allowedFiles?: string[],
    memberRestrictions?: any,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (newName && newName !== project.name) {
      const oldSafeName = project.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
      const newSafeName = newName.replace(/[^a-zA-Z0-9-_\.]/g, '_');

      if (oldSafeName !== newSafeName) {
        const workspacesDir =
          process.env.WORKSPACES_DIR ||
          path.resolve(process.cwd(), '..', 'workspaces');
        const oldPath = path.join(workspacesDir, oldSafeName);
        const newPath = path.join(workspacesDir, newSafeName);

        try {
          if (fs.existsSync(oldPath)) {
            // If the target already exists, we might need to handle it, but for now just rename
            if (!fs.existsSync(newPath)) {
              await fs.promises.rename(oldPath, newPath);
            }
          }
        } catch (e) {
          console.error(
            `Failed to rename workspace folder from ${oldSafeName} to ${newSafeName}`,
            e,
          );
          // We will proceed to update DB anyway even if folder rename fails (e.g. folder didn't exist)
        }
      }
    } // Closes `if (newName && newName !== project.name)`

    const updateData: any = {};
    if (newName && newName !== project.name) {
      project.name = newName;
      updateData.name = newName;
    }

    if (allowedCommands !== undefined) {
      project.allowedCommands = allowedCommands;
      updateData.allowedCommands = allowedCommands;
    }
    if (allowedFiles !== undefined) {
      project.allowedFiles = allowedFiles;
      updateData.allowedFiles = allowedFiles;
    }
    if (memberRestrictions !== undefined) {
      project.memberRestrictions = memberRestrictions;
      updateData.memberRestrictions = memberRestrictions;
    }

    if (Object.keys(updateData).length > 0) {
      await this.projectsRepository.update(id, updateData);
    }
    
    return project;
  }

  async recalculateStorage(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const safeName = project.name.replace(/[^a-zA-Z0-9-_\\.]/g, '_');
    const workspacesDir = process.env.WORKSPACES_DIR || path.resolve(process.cwd(), '..', 'workspaces');
    let projectDir = path.join(workspacesDir, safeName);
    
    // Fallback to ID directory if name directory doesn't exist (older format)
    if (!fs.existsSync(projectDir)) {
      const oldProjectDir = path.join(workspacesDir, id);
      if (fs.existsSync(oldProjectDir)) {
        projectDir = oldProjectDir;
      }
    }

    if (fs.existsSync(projectDir)) {
      const sizeBytes = await this.calculateDirectorySize(projectDir);
      project.storageBytes = sizeBytes;
      await this.projectsRepository.save(project);
    }
    return project;
  }

  async remove(id: string): Promise<void> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const safeName = project.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');

    // Remove from DB
    await this.projectsRepository.remove(project);

    // Optionally remove from filesystem
    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    const workspacePath = path.join(workspacesDir, safeName);
    try {
      if (fs.existsSync(workspacePath)) {
        await fs.promises.rm(workspacePath, { recursive: true, force: true });
      }
      // Also clean up old UUID path if it wasn't migrated
      const workspacesDir =
        process.env.WORKSPACES_DIR ||
        path.resolve(process.cwd(), '..', 'workspaces');
      const oldWorkspacePath = path.join(workspacesDir, id);
      if (fs.existsSync(oldWorkspacePath)) {
        await fs.promises.rm(oldWorkspacePath, {
          recursive: true,
          force: true,
        });
      }
    } catch (e) {
      console.error(`Failed to delete workspace files for ${id}`, e);
    }

    // Stop and remove the Docker container if it's currently running
    try {
      await execAsync(`docker stop scs-project-${id}`);
    } catch (e) {
      // Container might not be running, which is completely fine
    }
  }

  async importZip(id: string, fileBuffer: Buffer): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const safeName = project.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');

    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    if (!fs.existsSync(workspacesDir)) {
      await fs.promises.mkdir(workspacesDir, { recursive: true });
    }

    const projectDir = path.join(workspacesDir, safeName);
    // Clear out existing project files if they exist
    if (fs.existsSync(projectDir)) {
      await fs.promises.rm(projectDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(projectDir, { recursive: true });

    // Try to cleanup old UUID folder just in case
    const oldProjectDir = path.join(workspacesDir, id);
    if (fs.existsSync(oldProjectDir)) {
      await fs.promises.rm(oldProjectDir, { recursive: true, force: true });
    }

    const zipPath = path.join(workspacesDir, `${safeName}-import.zip`);
    await fs.promises.writeFile(zipPath, fileBuffer);

    // Extract
    try {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: projectDir }))
          .on('close', resolve)
          .on('error', reject);
      });
    } catch (err) {
      throw new Error(`Extraction failed: ${err.message}`);
    } finally {
      // Clean up zip
      await fs.promises.unlink(zipPath).catch(console.error);
    }

    // Calculate size
    const sizeBytes = await this.calculateDirectorySize(projectDir);

    // Update Project
    project.storageBytes = sizeBytes;
    await this.projectsRepository.save(project);

    return project;
  }

  async pullGitRepository(
    id: string,
    url: string,
    branch?: string,
    onProgress?: (pct: number) => void,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (!url) throw new BadRequestException('Repository URL is required');

    // Strict validation for github/gitlab URLs (ssh only)
    const isValidUrl = /^git@(github\.com|gitlab\.com):[^\/]+\/[^\/]+/.test(
      url,
    );
    if (!isValidUrl) {
      throw new BadRequestException(
        'Invalid GitHub/GitLab URL format. Must be a valid SSH URL (e.g. git@github.com:user/repo.git).',
      );
    }

    const safeName = project.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    const projectDir = path.join(workspacesDir, safeName);
    const tempDir = path.join(
      workspacesDir,
      safeName + '_git_tmp_' + Date.now(),
    );

    // Ensure target directory exists
    if (!fs.existsSync(projectDir)) {
      await fs.promises.mkdir(projectDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const args = ['clone', '--progress'];
      if (branch) {
        args.push('-b', branch);
      }
      args.push(url, tempDir);

      const env = { ...process.env };
      const sshKeyPath = path.join(workspacesDir, '.ssh', 'id_ed25519');
      if (fs.existsSync(sshKeyPath)) {
        env.GIT_SSH_COMMAND = `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`;
      }

      const child = spawn('git', args, { env });
      let errorLog = '';

      child.stderr.on('data', (data) => {
        const output = data.toString();
        errorLog += output; // collect for error reporting
        // git clone outputs progress on stderr. Look for percentages.
        const match = output.match(/(\d+)%/);
        if (match && onProgress) {
          onProgress(parseInt(match[1], 10));
        }
      });

      child.on('close', async (code) => {
        if (code === 0) {
          try {
            // Merge cloned files into the existing project directory
            await fs.promises.cp(tempDir, projectDir, { recursive: true });
            await fs.promises
              .rm(tempDir, { recursive: true, force: true })
              .catch(() => {});

            const sizeBytes = await this.calculateDirectorySize(projectDir);
            project.storageBytes = sizeBytes;
            await this.projectsRepository.save(project);
            resolve(project);
          } catch (err) {
            await fs.promises
              .rm(tempDir, { recursive: true, force: true })
              .catch(() => {});
            reject(
              new BadRequestException(
                'Failed to merge git repository into project',
              ),
            );
          }
        } else {
          await fs.promises
            .rm(tempDir, { recursive: true, force: true })
            .catch(() => {});
          // Use the captured stderr, extract the 'fatal:' part if possible
          const fatalMatch = errorLog.match(/fatal:.*(\n.*)?/);
          const errorMsg = fatalMatch
            ? fatalMatch[0].trim()
            : `Git clone failed with exit code ${code}`;
          reject(new BadRequestException(errorMsg));
        }
      });

      child.on('error', (err) => {
        reject(new BadRequestException(`Failed to spawn git: ${err.message}`));
      });
    });
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(itemPath);
        } else {
          const stats = await fs.promises.stat(itemPath);
          totalSize += stats.size;
        }
      }
    } catch (e) {
      // Ignore unreadable files
    }
    return totalSize;
  }

  async exportZip(id: string, res: any): Promise<void> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const safeName = project.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    let projectDir = path.join(workspacesDir, safeName);

    // Fallback to ID directory if name directory doesn't exist (older format)
    if (!fs.existsSync(projectDir)) {
      const oldProjectDir = path.join(workspacesDir, id);
      if (fs.existsSync(oldProjectDir)) {
        projectDir = oldProjectDir;
      } else {
        throw new NotFoundException('Workspace folder not found');
      }
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
    });

    const archive = new ZipArchive({
      zlib: { level: 9 }, // Maximum compression level
    });

    archive.on('error', (err: any) => {
      console.error(`Archiver error: ${err.message}`);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);
    archive.directory(projectDir, false); // false means put contents in root of zip, not inside a parent folder
    await archive.finalize();
  }

  async getAssignedProjects(userId: string): Promise<any[]> {
    const projects = await this.projectsRepository.find({
      relations: { users: true },
      order: { createdAt: 'DESC' },
    });

    // Filter out only projects where this user is assigned
    const assigned = projects.filter(
      (p) => p.users && p.users.some((u) => u.id === userId),
    );
    return assigned.map((p) => {
      const pMap = TerminalGateway.projectSessions.get(p.id);
      return {
        ...p,
        status: 'Running',
        onlineUsers: pMap ? pMap.size : 0,
      };
    });
  }

  async assignUser(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { users: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!project.users) project.users = [];
    if (!project.users.some((u) => u.id === user.id)) {
      project.users.push(user);
      await this.projectsRepository.save(project);
    }
    return project;
  }

  async assignUserByUsername(
    projectId: string,
    username: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { users: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const user = await this.usersService.findByUsername(username.toLowerCase());
    if (!user)
      throw new NotFoundException(`User with username ${username} not found`);

    if (!project.users) project.users = [];
    if (!project.users.some((u) => u.id === user.id)) {
      project.users.push(user);
      await this.projectsRepository.save(project);
    }
    return project;
  }

  async unassignUser(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { users: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (project.users) {
      project.users = project.users.filter((u) => u.id !== userId);
      await this.projectsRepository.save(project);
    }
    return project;
  }
}
