import { Controller, Get, Query } from '@nestjs/common';
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
}
