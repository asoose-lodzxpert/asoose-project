import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JobSummaryDto } from './job.dto';

@WebSocketGateway()
export class JobGateway {
  @WebSocketServer()
  server: Server;

  emitJobAssigned(userId: string, job: JobSummaryDto) {
    this.server.to(userId).emit('job.assigned', job);
  }

  emitJobUpdated(userId: string, job: JobSummaryDto) {
    this.server.to(userId).emit('job.updated', job);
  }

  emitJobCancelled(userId: string, job: JobSummaryDto) {
    this.server.to(userId).emit('job.cancelled', job);
  }
}
