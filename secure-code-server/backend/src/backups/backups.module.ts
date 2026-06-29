import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BackupsService } from './backups.service';
import { BackupsController } from './backups.controller';
import { BackupsProcessor } from './backups.processor';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'system-jobs',
    }),
    LogsModule,
  ],
  controllers: [BackupsController],
  providers: [BackupsService, BackupsProcessor],
})
export class BackupsModule {}
