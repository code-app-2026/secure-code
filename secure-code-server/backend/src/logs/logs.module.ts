import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { SecurityLog } from './entities/security-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityLog])],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
