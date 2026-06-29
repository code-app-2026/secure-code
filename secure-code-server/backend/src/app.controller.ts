import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello() {
    return {
      message: 'Secure Code Server is Running!',
      postgresql: 'Disconnected (Mocked for Testing) ❌',
      redis: 'Disconnected (Mocked for Testing) ❌',
    };
  }
}
