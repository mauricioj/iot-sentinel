import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: '*' },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      this.logger.log(`Client connected: ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data?.username || 'unknown'}`);
  }

  emitToAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  emitThingStatusChanged(data: { thingId: string; name: string; previousStatus: string; newStatus: string }) {
    this.emitToAll('thing:status_changed', { ...data, timestamp: new Date().toISOString() });
  }

  emitScanStarted(data: { jobId: string; networkId: string; type: string }) {
    this.emitToAll('scan:started', data);
  }

  emitScanCompleted(data: { jobId: string; networkId: string; newThings: number; updatedThings: number }) {
    this.emitToAll('scan:completed', data);
  }

  emitScanFailed(data: { jobId: string; networkId: string; error: string }) {
    this.emitToAll('scan:failed', data);
  }

  emitNewNotification(data: { notificationId: string; type: string; message: string; thingId?: string }) {
    this.emitToAll('notification:new', data);
  }
}
