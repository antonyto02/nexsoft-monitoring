import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AwsMqttService } from './aws-mqtt.service';
import { AggregationService } from './aggregation.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { EnvironmentLog, EnvironmentLogSchema } from './environment-log.schema';
import {
  EnvironmentHourlySummary,
  EnvironmentHourlySummarySchema,
} from './environment-hourly-summary.schema';
import {
  EnvironmentDailySummary,
  EnvironmentDailySummarySchema,
} from './environment-daily-summary.schema';
import {
  EnvironmentWeeklySummary,
  EnvironmentWeeklySummarySchema,
} from './environment-weekly-summary.schema';
import { Notification, NotificationSchema } from './notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnvironmentLog.name, schema: EnvironmentLogSchema },
      {
        name: EnvironmentHourlySummary.name,
        schema: EnvironmentHourlySummarySchema,
      },
      {
        name: EnvironmentDailySummary.name,
        schema: EnvironmentDailySummarySchema,
      },
      {
        name: EnvironmentWeeklySummary.name,
        schema: EnvironmentWeeklySummarySchema,
      },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [AwsMqttService, AggregationService, MonitoringService],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
