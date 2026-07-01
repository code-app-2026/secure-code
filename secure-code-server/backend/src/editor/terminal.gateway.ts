import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { EditorService } from './editor.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { LogsService } from '../logs/logs.service';
import { SettingsService } from '../settings/settings.service';
// We use require for node-pty as its types can sometimes be problematic in strict mode
const pty = require('node-pty');
const execAsync = promisify(exec);

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly editorService: EditorService,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
    private readonly settingsService: SettingsService,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  // Map socket IDs to their PTY instances
  private ptys = new Map<string, any>();
  // Map socket IDs to their input buffers
  private inputBuffers = new Map<string, string>();
  // Map socket IDs to their user object
  private users = new Map<string, any>();

  // Map<projectId, Map<userId, count>> for real-time online tracking
  public static projectSessions = new Map<string, Map<string, number>>();
  // Map<socketId, { projectId: string, userId: string, username: string, activeFile: string | null }>
  private static socketSessions = new Map<
    string,
    { projectId: string; userId: string; username: string; activeFile: string | null }
  >();

  private broadcastProjectActiveUsers(projectId: string) {
    const activeUsers: Array<{ userId: string; username: string; activeFile: string | null }> = [];
    for (const [socketId, session] of TerminalGateway.socketSessions.entries()) {
      if (session.projectId === projectId) {
        // Prevent duplicates for the same user if they have multiple tabs, just pick the one with a file if possible
        const existing = activeUsers.find((u) => u.userId === session.userId);
        if (existing) {
          if (!existing.activeFile && session.activeFile) {
            existing.activeFile = session.activeFile;
          }
        } else {
          activeUsers.push({
            userId: session.userId,
            username: session.username,
            activeFile: session.activeFile,
          });
        }
      }
    }
    this.server.to(`project-${projectId}`).emit('project.activeUsers', activeUsers);
  }

  async handleConnection(client: Socket) {
    console.log(`Terminal client connected: ${client.id}`);

    // Determine the shell based on the OS
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const projectId = client.handshake.query?.projectId as string;

    // Set cwd to the workspace directory
    let cwd =
      process.env.WORKSPACES_DIR ||
      path.resolve(process.cwd(), '..', 'workspaces');

    const token = client.handshake.query?.token as string;
    let user: any = null;
    if (token) {
      try {
        user = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'fallback_secret',
        });
        this.users.set(client.id, user);
      } catch (e) {
        console.error('Failed to verify token for terminal', e);
      }
    }

    if (projectId && user) {
      client.join(`project-${projectId}`);
      TerminalGateway.socketSessions.set(client.id, {
        projectId,
        userId: user.id || user.sub,
        username: user.username || user.name || 'Anonymous',
        activeFile: null,
      });
      let projectMap = TerminalGateway.projectSessions.get(projectId);
      if (!projectMap) {
        projectMap = new Map<string, number>();
        TerminalGateway.projectSessions.set(projectId, projectMap);
      }
      projectMap.set(user.id || user.sub, (projectMap.get(user.id || user.sub) || 0) + 1);
      
      setTimeout(() => this.broadcastProjectActiveUsers(projectId), 500);
    }

    if (projectId) {
      try {
        cwd = await this.editorService.getRootPath(projectId);
      } catch (e) {
        console.error('Failed to resolve workspace directory for terminal', e);
      }
    }

    // Prevent zombie terminals: Check if the client disconnected while we were awaiting the DB!
    if (client.disconnected) {
      console.log(
        `Client ${client.id} disconnected before terminal could be spawned.`,
      );
      return;
    }

    // Ensure the directory exists before spawning terminal
    if (projectId && !fs.existsSync(cwd)) {
      try {
        fs.mkdirSync(cwd, { recursive: true });
      } catch (e) {
        console.error('Failed to create workspace directory for terminal', e);
      }
    }

    try {
      const workspacesDir =
        process.env.WORKSPACES_DIR ||
        path.resolve(process.cwd(), '..', 'workspaces');
      const sshKeyPath = path.join(workspacesDir, '.ssh', 'id_ed25519');
      const env: any = {
        ...process.env,
        GIT_CEILING_DIRECTORIES: workspacesDir,
        HISTSIZE: '0',
        HISTFILE: '/dev/null',
        PROMPT_COMMAND: 'history -c', // aggressively clear history
      };
      if (fs.existsSync(sshKeyPath)) {
        env.GIT_SSH_COMMAND = `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`;
      }

      let ptyProcess;
      
      if (projectId) {
        const containerName = `scs-project-${projectId}`;
        
        try {
          // Check if container is running
          await execAsync(`docker inspect ${containerName}`);
        } catch (err) {
          // If not running or doesn't exist, spin it up using Shared Runtime Pool cached image
          console.log(`Spinning up Docker container for project ${projectId}...`);
          // If the backend itself is running in Docker (e.g. Azure), it needs to know the absolute HOST path to mount.
          // We can automatically discover this by inspecting our own container!
          let hostWorkspacesDir = process.env.HOST_WORKSPACES_PATH;
          
          if (!hostWorkspacesDir) {
            try {
              // Our docker-compose.yml hardcodes the backend container name to 'secure_code_backend'
              const { stdout } = await execAsync('docker inspect secure_code_backend');
              const containerInfo = JSON.parse(stdout);
              if (containerInfo && containerInfo[0] && containerInfo[0].Mounts) {
                const workspacesMount = containerInfo[0].Mounts.find((m: any) => m.Destination === '/workspaces');
                if (workspacesMount && workspacesMount.Source) {
                  hostWorkspacesDir = workspacesMount.Source;
                  console.log(`Auto-discovered Host Workspace Path: ${hostWorkspacesDir}`);
                }
              }
            } catch (e) {
              // Normal if running locally without Docker. We will fallback silently.
            }
          }

          // Fallback to the backend's own cwd if auto-discovery fails (works perfectly on localhost natively)
          if (!hostWorkspacesDir) {
            hostWorkspacesDir = workspacesDir;
          }

          const relativeProjectDir = path.basename(cwd); // e.g. "my_project_name"
          const finalHostMountPath = path.join(hostWorkspacesDir, relativeProjectDir);

          // Dynamically discover the network the backend is running on
          let networkName = 'secure_code_network';
          try {
            const { stdout: netStdout } = await execAsync('docker inspect secure_code_backend');
            const netInfo = JSON.parse(netStdout);
            if (netInfo && netInfo[0] && netInfo[0].NetworkSettings && netInfo[0].NetworkSettings.Networks) {
              const networks = Object.keys(netInfo[0].NetworkSettings.Networks);
              if (networks.length > 0) {
                networkName = networks[0];
                console.log(`Auto-discovered Docker Network: ${networkName}`);
              }
            }
          } catch (e) {
            // fallback
          }

          try {
            await execAsync(`docker run -d --rm --name ${containerName} --network ${networkName} -v "${finalHostMountPath}:/workspace" -w /workspace node:18 tail -f /dev/null`);
          } catch (e: any) {
            console.error('Failed to start docker container:', e);
            client.emit('terminal.output', `\\r\\n\\x1b[31mError: Failed to start isolated container. ${e.message}\\x1b[0m\\r\\n`);
            return;
          }
        }

        // Attach node-pty to the running container
        ptyProcess = pty.spawn('docker', ['exec', '-it', containerName, 'bash'], {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
        });
      } else {
        // Fallback to host if no projectId (e.g. global viewer/admin)
        ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd,
          env,
        });
      }

      // Stream terminal output back to the specific client
      ptyProcess.onData((data: string) => {
        client.emit('terminal.output', data);
      });

      this.ptys.set(client.id, ptyProcess);
    } catch (err) {
      console.error('Failed to spawn terminal:', err);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Terminal client disconnected: ${client.id}`);
    const session = TerminalGateway.socketSessions.get(client.id);
    if (session) {
      const { projectId, userId } = session;
      const projectMap = TerminalGateway.projectSessions.get(projectId);
      if (projectMap) {
        const count = projectMap.get(userId) || 0;
        if (count > 1) {
          projectMap.set(userId, count - 1);
        } else {
          projectMap.delete(userId);
          if (projectMap.size === 0) {
            TerminalGateway.projectSessions.delete(projectId);
            // Garbage Collection: Kill the container since no one is using it anymore
            console.log(`Last user disconnected from project ${projectId}, stopping container...`);
            exec(`docker stop scs-project-${projectId}`, (error) => {
              if (error) console.error(`Failed to stop container scs-project-${projectId}`, error);
            });
          }
        }
      }
      TerminalGateway.socketSessions.delete(client.id);
      this.broadcastProjectActiveUsers(projectId);
    }

    const ptyProcess = this.ptys.get(client.id);
    if (ptyProcess) {
      ptyProcess.kill();
      this.ptys.delete(client.id);
      this.inputBuffers.delete(client.id);
      this.users.delete(client.id);
    }
  }

  @SubscribeMessage('user.active_file')
  handleUserActiveFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activeFile: string | null }
  ) {
    const session = TerminalGateway.socketSessions.get(client.id);
    if (session) {
      session.activeFile = data.activeFile;
      TerminalGateway.socketSessions.set(client.id, session);
      this.broadcastProjectActiveUsers(session.projectId);
    }
  }

  @SubscribeMessage('terminal.input')
  async handleTerminalInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string,
  ) {
    const ptyProcess = this.ptys.get(client.id);
    if (ptyProcess) {
      const user = this.users.get(client.id);
      if (user && user.role === 'Viewer') return; // Viewers cannot use terminal

      if (user && user.role !== 'Admin') {
        const projectId = client.handshake.query?.projectId as string;
        let buffer = this.inputBuffers.get(client.id) || '';

        if (data === '\x7f' || data === '\b') {
          buffer = buffer.slice(0, -1);
          this.inputBuffers.set(client.id, buffer);
          ptyProcess.write(data);
          return;
        } else if (data === '\x03') {
          // Ctrl+C
          this.inputBuffers.set(client.id, '');
          ptyProcess.write(data);
          return;
        }

        buffer += data;

        if (buffer.includes('\r') || buffer.includes('\n')) {
          if (projectId) {
            const project = await this.projectsRepository.findOne({
              where: { id: projectId },
            });
            const globalBlacklist = [
              'git',
              'sudo',
              'su',
              'curl',
              'wget',
              'apt',
              'apt-get',
              'dpkg',
              'rm -rf /',
            ];
            let customBlacklist = [...(project?.allowedCommands || [])];
            
            let parsedRestrictions = project?.memberRestrictions;
            if (typeof parsedRestrictions === 'string') {
              try { parsedRestrictions = JSON.parse(parsedRestrictions); } catch(e) {}
            }
            
            const userId = user.sub || user.id;

            if (user && parsedRestrictions && parsedRestrictions[userId] && parsedRestrictions[userId].allowedCommands) {
              customBlacklist = [...customBlacklist, ...parsedRestrictions[userId].allowedCommands];
            }
            const combinedBlacklist = [
              ...new Set([...globalBlacklist, ...customBlacklist]),
            ];

            let dynamicBlockedRegex: RegExp | null = null;
            try {
              const blockedCommandsStr = await this.settingsService.getSetting(
                'blockedCommands',
                '',
              );
              if (blockedCommandsStr && blockedCommandsStr.trim() !== '') {
                dynamicBlockedRegex = new RegExp(blockedCommandsStr, 'i');
              }
            } catch (e) {
              console.error('Failed to parse blocked commands regex:', e);
            }
            const lines = buffer.split(/[\r\n]+/);
            const remainingBuffer = lines.pop() || '';

            for (const line of lines) {
              // Strip ANSI escape codes (like arrow keys) from our application-level buffer check
              const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
              const rawCmd = cleanLine.trim();
              if (!rawCmd) continue;

              // Normalize spaces and tabs
              const normalizedCmd = rawCmd
                .toLowerCase()
                .replace(/[\s\t]+/g, ' ');
              const baseCmd = normalizedCmd.split(' ')[0];

              // Project's "allowedCommands" in the database is actually used as RESTRICTED commands in the UI.
              let projectRestricted = [...(project?.allowedCommands || [])];
              let restrictedFiles = [...(project?.allowedFiles || [])];
              
              if (user && parsedRestrictions && parsedRestrictions[userId]) {
                if (parsedRestrictions[userId].allowedCommands) {
                  projectRestricted = [...projectRestricted, ...parsedRestrictions[userId].allowedCommands];
                }
                if (parsedRestrictions[userId].allowedFiles) {
                  restrictedFiles = [...restrictedFiles, ...parsedRestrictions[userId].allowedFiles];
                }
              }

              let isBlocked = false;
              let errorMessage = '';

              // Check regex first
              if (dynamicBlockedRegex && dynamicBlockedRegex.test(rawCmd)) {
                isBlocked = true;
                errorMessage = `Command execution blocked by security policy.`;
              }

              // Check global and project blacklists
              if (!isBlocked) {
                const globalAndProjectList = [...globalBlacklist, ...(project?.allowedCommands || [])];
                for (const restrictedCmd of globalAndProjectList) {
                  const lowerRestricted = restrictedCmd.toLowerCase().replace(/[\s\t]+/g, ' ');
                  if (
                    baseCmd === lowerRestricted ||
                    normalizedCmd === lowerRestricted ||
                    normalizedCmd.startsWith(lowerRestricted + ' ')
                  ) {
                    isBlocked = true;
                    errorMessage = `Command execution blocked by security policy.`;
                    break;
                  }
                }
              }

              // Check Admin Member-specific restrictions
              if (!isBlocked && user && parsedRestrictions && parsedRestrictions[userId] && parsedRestrictions[userId].allowedCommands) {
                for (const restrictedCmd of parsedRestrictions[userId].allowedCommands) {
                  const lowerRestricted = restrictedCmd.toLowerCase().replace(/[\s\t]+/g, ' ');
                  if (
                    baseCmd === lowerRestricted ||
                    normalizedCmd === lowerRestricted ||
                    normalizedCmd.startsWith(lowerRestricted + ' ')
                  ) {
                    isBlocked = true;
                    errorMessage = `Command execution blocked by Admin.`;
                    break;
                  }
                }
              }

              // Check restricted files/folders interception
              if (!isBlocked && restrictedFiles.length > 0) {
                for (const restrictedFile of restrictedFiles) {
                  const parts = restrictedFile.split('/');
                  const folderName = parts[parts.length - 1];
                  if (!folderName) continue;
                  
                  const lowerFolderName = folderName.toLowerCase();
                  
                  if (
                    normalizedCmd.includes(` ${lowerFolderName}`) ||
                    normalizedCmd.includes(`/${lowerFolderName}`) ||
                    normalizedCmd.includes(`'${lowerFolderName}'`) ||
                    normalizedCmd.includes(`"${lowerFolderName}"`) ||
                    normalizedCmd.includes(`=${lowerFolderName}`)
                  ) {
                    isBlocked = true;
                    errorMessage = `Command execution blocked because the file or folder '${folderName}' is restricted.`;
                    break;
                  }
                }
              }

              if (isBlocked) {
                client.emit(
                  'terminal.output',
                  `\r\n\x1b[31mError: ${errorMessage}\x1b[0m\r\n`,
                );
                this.inputBuffers.set(client.id, '');

                // Clear the hanging prompt in the pty by sending a SIGINT (Ctrl+C)
                ptyProcess.write('\x03');

                // Log as Security Threat
                this.logsService
                  .logThreat({
                    userId: userId,
                    username: user.username,
                    action: 'BLOCKED_TERMINAL_COMMAND',
                    details: `Attempted to run restricted command: ${rawCmd} in project ${projectId}`,
                    ipAddress: client.handshake.address,
                  })
                  .catch((e) => console.error('Failed to log threat:', e));

                return; // Block execution and don't write the enter key to pty
              }
            }

            this.inputBuffers.set(client.id, remainingBuffer);
          } else {
            // No projectId, but we still handle the buffer
            const lines = buffer.split(/[\r\n]+/);
            const remainingBuffer = lines.pop() || '';
            this.inputBuffers.set(client.id, remainingBuffer);
          }
        } else {
          this.inputBuffers.set(client.id, buffer);
        }
      }

      try {
        ptyProcess.write(data);
      } catch (err) {
        console.error('Failed to write to pty:', err);
      }
    }
  }
  @SubscribeMessage('terminal.resize')
  handleTerminalResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() size: { cols: number; rows: number },
  ) {
    const ptyProcess = this.ptys.get(client.id);
    if (ptyProcess && size.cols && size.rows) {
      try {
        ptyProcess.resize(size.cols, size.rows);
      } catch (err) {
        console.error('Resize error:', err);
      }
    }
  }
}
