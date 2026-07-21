import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Websocket Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Websocket Client Disconnected: ${client.id}`);
  }

  broadcastLocationUpdate(locationData: any) {
    if (this.server) {
      this.server.emit('locationUpdate', locationData);
    }
  }
}
