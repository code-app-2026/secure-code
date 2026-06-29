import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';
import { TerminalGateway } from './terminal.gateway';
import { Project } from '../projects/entities/project.entity';
import { JwtModule } from '@nestjs/jwt';
import { ProjectsModule } from '../projects/projects.module';
import { LogsModule } from '../logs/logs.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    JwtModule.register({}),
    forwardRef(() => ProjectsModule),
    LogsModule,
    SettingsModule,
  ],
  controllers: [EditorController],
  providers: [EditorService, TerminalGateway],
  exports: [EditorService],
})
export class EditorModule {}
