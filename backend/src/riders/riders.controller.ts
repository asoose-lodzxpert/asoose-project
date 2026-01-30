import {
  Controller,
  UseGuards,
  Sse,
  MessageEvent,
  Request,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RidersStreamService } from './riders-stream.service';

@Controller('riders')
export class RidersController {
  constructor(private readonly streamService: RidersStreamService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Sse('jobs/stream')
  streamEvents(@Request() req): Observable<MessageEvent> {
    const riderId = req.user.id;
    return this.streamService.getRiderStream(riderId);
  }
}
