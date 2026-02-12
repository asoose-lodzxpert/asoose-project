import { Controller } from '@nestjs/common';

@Controller({
  path: 'riders',
  version: '1',
})
export class RidersController {
  // SSE endpoint removed - using WebSocket via NotificationsGateway instead
  // Riders now receive job assignments via socket events (job.assigned, job.updated, job.cancelled)
}
