import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import * as http from 'http';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

async function bootstrap() {
  // ─── Yjs WebSocket Server — dedicated HTTP server on port 1234 ──────────
  // MUST be on its own server, NOT shared with Socket.IO (port 3001).
  // engine.io (Socket.IO's WS layer) intercepts ALL 'upgrade' events on the
  // shared server and calls socket.destroy() for any path that isn't /socket.io,
  // which silently kills every Yjs WebSocket connection before y-websocket sees it.
  const yjsHttpServer = http.createServer((_, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' });
    res.end('Upgrade Required — this port only serves WebSocket connections');
  });
  const wss = new WebSocketServer({ server: yjsHttpServer });
  wss.on('connection', (conn, req) => {
    setupWSConnection(conn, req, { gc: true });
  });
  yjsHttpServer.listen(1234, '0.0.0.0', () => {
    console.log('[Yjs] WebSocket server listening on port 1234');
  });

  // ─── NestJS / Socket.IO — port 3001 ─────────────────────────────────────
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
