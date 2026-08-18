import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface LocationUpdatePayload {
  id: string;
  deviceId: string;
  employee_code: string;
  name: string;
  status: string;
  lat: number | null;
  lng: number | null;
  address?: string;
  battery?: number;
  recorded_date_time?: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000'],
  },
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  broadcastLocationUpdate(locationData: LocationUpdatePayload) {
    if (this.server) {
      this.server.emit('locationUpdate', locationData);
    }
  }
}
