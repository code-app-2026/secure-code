import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [HttpModule, LogsModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
