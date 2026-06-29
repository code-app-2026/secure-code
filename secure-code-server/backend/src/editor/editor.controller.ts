import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { EditorService } from './editor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';

@Controller('editor')
export class EditorController {
  constructor(
    private readonly editorService: EditorService,
    private readonly projectsService: ProjectsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('tree')
  async getTree(
    @Query('path') dirPath: string,
    @Query('projectId') projectId?: string,
    @Query('recursive') recursive?: string,
  ) {
    return this.editorService.getTree(
      dirPath || '',
      projectId,
      recursive === 'true',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('file')
  async getFile(
    @Query('path') filePath: string,
    @Query('projectId') projectId: string,
    @Req() req: any,
  ) {
    if (!filePath) throw new BadRequestException('File path is required');
    await this.editorService.checkFileAccess(projectId, filePath, req.user);
    return { content: await this.editorService.readFile(filePath, projectId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('file')
  async saveFile(
    @Body() body: { path: string; content: string; projectId: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to modify files.');
    if (!body.path) throw new BadRequestException('File path is required');
    await this.editorService.checkFileAccess(
      body.projectId,
      body.path,
      req.user,
    );
    await this.editorService.writeFile(
      body.path,
      body.content || '',
      body.projectId,
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('folder')
  async createFolder(
    @Body() body: { path: string; projectId: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to modify files.');
    if (!body.path) throw new BadRequestException('Folder path is required');
    await this.editorService.checkFileAccess(
      body.projectId,
      body.path,
      req.user,
    );
    await this.editorService.createFolder(body.path, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('file/new')
  async createFile(
    @Body() body: { path: string; projectId: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to modify files.');
    if (!body.path) throw new BadRequestException('File path is required');
    await this.editorService.checkFileAccess(
      body.projectId,
      body.path,
      req.user,
    );
    await this.editorService.createEmptyFile(body.path, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('item')
  async deleteItem(
    @Query('path') itemPath: string,
    @Query('projectId') projectId: string,
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to modify files.');
    if (!itemPath) throw new BadRequestException('Item path is required');
    await this.editorService.checkFileAccess(projectId, itemPath, req.user);
    await this.editorService.deleteItem(itemPath, projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rename')
  async renameItem(
    @Body() body: { oldPath: string; newPath: string; projectId: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to modify files.');
    if (!body.oldPath || !body.newPath) {
      throw new BadRequestException('oldPath and newPath are required');
    }
    await this.editorService.checkFileAccess(
      body.projectId,
      body.oldPath,
      req.user,
    );
    await this.editorService.checkFileAccess(
      body.projectId,
      body.newPath,
      req.user,
    );
    await this.editorService.renameItem(
      body.oldPath,
      body.newPath,
      body.projectId,
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('copy')
  async copyItem(
    @Body() body: { srcPath: string; destPath: string; projectId: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to modify files.');
    if (!body.srcPath || !body.destPath) {
      throw new BadRequestException('srcPath and destPath are required');
    }
    await this.editorService.checkFileAccess(
      body.projectId,
      body.srcPath,
      req.user,
    );
    await this.editorService.checkFileAccess(
      body.projectId,
      body.destPath,
      req.user,
    );
    await this.editorService.copyItem(
      body.srcPath,
      body.destPath,
      body.projectId,
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('git/push')
  async gitPush(
    @Body() body: { projectId: string; commitMessage: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'Viewer')
      throw new BadRequestException('Viewers are not allowed to push code.');
    if (!body.projectId)
      throw new BadRequestException('Project ID is required');
    if (!body.commitMessage)
      throw new BadRequestException('Commit message is required');

    // Using a top-level access check for the project root to ensure they have access to the project
    await this.editorService.checkFileAccess(body.projectId, '', req.user);
    await this.editorService.gitPush(
      body.projectId,
      body.commitMessage,
      req.user,
    );
    await this.projectsService.createDeployment(
      body.projectId,
      req.user.id,
      body.commitMessage,
    );
    return { success: true };
  }
}
