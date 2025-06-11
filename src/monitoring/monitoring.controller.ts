import {
  Controller,
  Get,
  Query,
  Patch,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('temperature-graph')
  getTemperature(@Query('filter') filter: string) {
    return this.monitoringService.getTemperatureGraph(filter);
  }

  @Get('humidity-graph')
  getHumidity(@Query('filter') filter: string) {
    return this.monitoringService.getHumidityGraph(filter);
  }

  @Get('home')
  getHome() {
    return this.monitoringService.getHomeData();
  }

  @Get('notifications')
  getNotifications(
    @Query('sensor_type') sensorType?: string,
    @Query('read_status') readStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.monitoringService.getNotifications(
      sensorType ?? 'all',
      readStatus ?? 'all',
      pageNum,
      limitNum,
    );
  }

  @Patch('notifications/:id')
  async markNotificationRead(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    if (status !== 'read') {
      throw new BadRequestException('Invalid status value');
    }
    await this.monitoringService.markNotificationRead(id);
    return { message: 'Notificación marcada como leída' };
  }
}
