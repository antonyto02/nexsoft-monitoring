import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AwsMqttService } from './aws-mqtt.service';
import { EnvironmentLog, EnvironmentLogSchema } from './environment-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EnvironmentLog.name, schema: EnvironmentLogSchema }]),
  ],
  providers: [AwsMqttService],
})
export class MonitoringModule {}
