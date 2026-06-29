import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

@Controller('system/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Sse('stream')
  streamMetrics(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      // Fetch immediately on connect
      this.metricsService.getMetrics().then(data => {
        subscriber.next({ data: data || {} } as MessageEvent);
      }).catch(err => {
        subscriber.next({ data: { error: err.message } } as MessageEvent);
      });

      // Then poll every 1000ms
      const timer = setInterval(async () => {
        try {
          const data = await this.metricsService.getMetrics();
          subscriber.next({ data: data || {} } as MessageEvent);
        } catch (err: any) {
          subscriber.next({ data: { error: err.message } } as MessageEvent);
        }
      }, 1000);

      return () => clearInterval(timer);
    });
  }
}
