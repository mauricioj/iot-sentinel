import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Rules
  @Post('notifications/rules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create notification rule' })
  createRule(@Body() dto: CreateNotificationRuleDto) {
    return this.notificationsService.createRule(dto);
  }

  @Get('notifications/rules')
  @ApiOperation({ summary: 'List notification rules' })
  findAllRules(@Query() query: PaginationQueryDto) {
    return this.notificationsService.findAllRules(query.page, query.limit);
  }

  @Patch('notifications/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update notification rule' })
  updateRule(@Param('id') id: string, @Body() dto: UpdateNotificationRuleDto) {
    return this.notificationsService.updateRule(id, dto);
  }

  @Delete('notifications/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete notification rule' })
  deleteRule(@Param('id') id: string) {
    return this.notificationsService.deleteRule(id);
  }

  // Notifications
  @Get('notifications')
  @ApiOperation({ summary: 'List notifications' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.notificationsService.findAllNotifications(query.page, query.limit);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  countUnread() {
    return this.notificationsService.countUnread();
  }
}
