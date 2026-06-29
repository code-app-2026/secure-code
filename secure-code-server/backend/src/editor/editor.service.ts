import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

@Injectable()
export class EditorService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  private sanitizeProjectName(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
  }

  async checkFileAccess(
    projectId: string | undefined,
    targetPath: string,
    user: any,
  ): Promise<void> {
    if (!projectId || !user || !targetPath) return;
    if (user.role === 'Admin') return; // Admins bypass restrictions

    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) return;

    let restrictedFiles = [...(project.allowedFiles || [])];
    if (project.memberRestrictions && project.memberRestrictions[user.id] && project.memberRestrictions[user.id].allowedFiles) {
      restrictedFiles = [...restrictedFiles, ...project.memberRestrictions[user.id].allowedFiles];
    }

    if (restrictedFiles.length > 0) {
      // It's a blacklist
      for (const restrictedPath of restrictedFiles) {
        const trimmedR = restrictedPath.trim().replace(/\\/g, '/').replace(/\/$/, '');
        const normalizedTarget = targetPath.replace(/\\/g, '/').replace(/\/$/, '');
        if (
          normalizedTarget === trimmedR ||
          normalizedTarget.startsWith(trimmedR + '/') ||
          normalizedTarget.endsWith('/' + trimmedR) ||
          normalizedTarget.includes('/' + trimmedR + '/')
        ) {
          const itemName = targetPath.split('/').pop() || targetPath;
          throw new BadRequestException(
            `Not Allowed: "${itemName}" is restricted by the admin.`,
          );
        }
      }
    }
  }

  async getRootPath(projectId?: string): Promise<string> {
    if (!projectId) {
      throw new BadRequestException(
        'Project ID is required to access workspace.',
      );
    }
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }
    const safeName = this.sanitizeProjectName(project.name);
    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    const newPath = path.join(workspacesDir, safeName);
    const oldPath = path.join(workspacesDir, projectId);

    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      try {
        await fs.promises.rename(oldPath, newPath);
      } catch (e) {
        console.error(
          `Failed to migrate workspace from ${oldPath} to ${newPath}`,
          e,
        );
      }
    }

    if (!fs.existsSync(newPath)) {
      await fs.promises.mkdir(newPath, { recursive: true });
    }

    return newPath;
  }

  async itemExists(itemPath: string, projectId?: string): Promise<boolean> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, itemPath);
    if (!targetPath.startsWith(rootPath)) return false;
    return fs.existsSync(targetPath);
  }

  async getTree(
    dirPath: string = '',
    projectId?: string,
    recursive: boolean = false,
  ): Promise<any[]> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, dirPath);

    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      if (!fs.existsSync(targetPath)) {
        if (projectId && !dirPath) {
          const project = await this.projectsRepository.findOne({
            where: { id: projectId },
          });
          const projectName = project ? project.name : path.basename(rootPath);
          return [
            {
              name: projectName,
              path: '',
              isDirectory: true,
              children: [],
              isRootNode: true,
            },
          ];
        }
        return [];
      }

      const readDirRecursive = async (
        currentPath: string,
        relativeDir: string,
      ) => {
        const items = await fs.promises.readdir(currentPath, {
          withFileTypes: true,
        });
        const nodes: any[] = [];

        for (const item of items) {
          if (item.name === '.git') continue;

          const nodePath = path.join(relativeDir, item.name);
          const fullItemPath = path.join(currentPath, item.name);

          const node: any = {
            name: item.name,
            path: nodePath.replace(/\\/g, '/'),
            isDirectory: item.isDirectory(),
          };

          if (item.isDirectory() && recursive) {
            node.children = await readDirRecursive(fullItemPath, nodePath);
          }
          nodes.push(node);
        }

        nodes.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
          }
          return a.isDirectory ? -1 : 1;
        });

        return nodes;
      };

      const children = await readDirRecursive(targetPath, dirPath);

      // If this is a project root request (no sub-path), wrap in a root folder node
      // so the project folder name appears at the top of the tree (like VS Code)
      if (projectId && !dirPath) {
        const project = await this.projectsRepository.findOne({
          where: { id: projectId },
        });
        const projectName = project ? project.name : path.basename(rootPath);
        return [
          {
            name: projectName,
            path: '',
            isDirectory: true,
            children,
            isRootNode: true,
          },
        ];
      }

      return children;
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new BadRequestException(`Failed to read directory: ${err.message}`);
    }
  }

  async readFile(filePath: string, projectId?: string): Promise<string> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, filePath);

    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      return await fs.promises.readFile(targetPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw new BadRequestException(`Failed to read file: ${err.message}`);
    }
  }

  async writeFile(
    filePath: string,
    content: string,
    projectId?: string,
  ): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, filePath);

    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, content, 'utf8');
    } catch (err) {
      throw new BadRequestException(`Failed to write file: ${err.message}`);
    }
  }

  async createFolder(folderPath: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, folderPath);

    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    if (fs.existsSync(targetPath)) {
      throw new BadRequestException('Folder already exists');
    }

    try {
      await fs.promises.mkdir(targetPath, { recursive: true });
    } catch (err) {
      throw new BadRequestException(`Failed to create folder: ${err.message}`);
    }
  }

  async createEmptyFile(filePath: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, filePath);

    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, '', { flag: 'wx' });
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new BadRequestException('File already exists');
      }
      throw new BadRequestException(`Failed to create file: ${err.message}`);
    }
  }

  async deleteItem(itemPath: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, itemPath);

    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }
    if (targetPath === rootPath) {
      throw new BadRequestException('Cannot delete root project directory');
    }

    try {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw new BadRequestException(`Failed to delete item: ${err.message}`);
      }
    }
  }

  async renameItem(
    oldPath: string,
    newPath: string,
    projectId?: string,
  ): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetOldPath = path.join(rootPath, oldPath);
    const targetNewPath = path.join(rootPath, newPath);

    if (
      !targetOldPath.startsWith(rootPath) ||
      !targetNewPath.startsWith(rootPath)
    ) {
      throw new BadRequestException('Invalid path');
    }

    if (!fs.existsSync(targetOldPath)) {
      throw new BadRequestException('Source item does not exist.');
    }

    if (fs.existsSync(targetNewPath)) {
      throw new BadRequestException(
        'An item with this name already exists at the destination.',
      );
    }

    try {
      await fs.promises.mkdir(path.dirname(targetNewPath), { recursive: true });
      await fs.promises.rename(targetOldPath, targetNewPath);
    } catch (err) {
      throw new BadRequestException(`Failed to rename item: ${err.message}`);
    }
  }

  async copyItem(
    srcPath: string,
    destPath: string,
    projectId?: string,
  ): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const sourcePath = path.join(rootPath, srcPath);
    const targetPath = path.join(rootPath, destPath);

    if (!sourcePath.startsWith(rootPath) || !targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    if (!fs.existsSync(sourcePath)) {
      throw new BadRequestException('Source file or folder not found');
    }

    // Existence check already handled by controller, but just to be safe:
    if (fs.existsSync(targetPath)) {
      throw new BadRequestException(
        'An item with this name already exists at the destination.',
      );
    }

    try {
      await fs.promises.cp(sourcePath, targetPath, { recursive: true });
    } catch (err) {
      throw new BadRequestException(`Failed to copy item: ${err.message}`);
    }
  }

  async gitPush(
    projectId: string,
    commitMessage: string,
    user?: any,
  ): Promise<void> {
    const rootPath = await this.getRootPath(projectId);

    const workspacesDir =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');
    const sshKeyPath = path.join(workspacesDir, '.ssh', 'id_ed25519');
    const env = { ...process.env };
    if (fs.existsSync(sshKeyPath)) {
      env.GIT_SSH_COMMAND = `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`;
    }

    try {
      // Must explicitly check for .git in rootPath to prevent Git from walking up the directory tree
      // and interacting with the backend's own parent repository.
      const gitFolderPath = path.join(rootPath, '.git');
      if (!fs.existsSync(gitFolderPath)) {
        throw new BadRequestException(
          'Project is Imported Locally, Github/Gitlab not linked',
        );
      }

      // Check if project is a git repo by trying to get remote URL
      let remotes = '';

      try {
        const result = await execAsync('git remote -v', { cwd: rootPath, env });
        remotes = result.stdout;
      } catch (err) {
        // If git remote -v fails, no remote is configured
      }

      if (!remotes.trim()) {
        throw new BadRequestException(
          'Project is Imported Locally Github/Gitlab not linked',
        );
      }

      // Execute git add, commit, and push sequentially
      await execAsync('git add .', { cwd: rootPath, env });

      // Escape commit message to prevent shell injection (rudimentary)
      const safeCommitMessage = commitMessage.replace(/"/g, '\\"');

      // If we have a user object, dynamically set the author for this commit
      if (user && user.username) {
        const safeUsername = user.username.replace(/"/g, '\\"');
        await execAsync(
          `git -c user.name="${safeUsername}" -c user.email="${safeUsername}@securecode.local" commit -m "${safeCommitMessage}"`,
          { cwd: rootPath, env },
        );
      } else {
        await execAsync(`git commit -m "${safeCommitMessage}"`, {
          cwd: rootPath,
          env,
        });
      }

      // Attempt to push
      await execAsync('git push', { cwd: rootPath, env });
    } catch (err: any) {
      // If there are no changes to commit, it throws an error but that's not really a failure we want to bubble up as a crash
      if (err.stdout && err.stdout.includes('nothing to commit')) {
        await execAsync('git push', { cwd: rootPath, env }).catch((e) => {
          throw new BadRequestException(`Git push failed: ${e.message}`);
        });
        return;
      }
      throw new BadRequestException(`Git operation failed: ${err.message}`);
    }
  }
}
