import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Allow frontend to communicate with backend

  // Increase payload limit to allow saving large files up to 50MB
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0'); // NestJS runs on 3001, Next.js on 3000

  // Configure Yjs WebSocket Server on the same HTTP server
  const server = app.getHttpServer();
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (conn, req) => {
    setupWSConnection(conn, req, { gc: true });
  });

  server.on('upgrade', (request: any, socket: any, head: any) => {
    if (request.url.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
}
bootstrap();
