import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://antonyto02:T6DfHvPfMLXLCu4k@nextsoft-cluster.k7wjxb9.mongodb.net/MonitoringDB?retryWrites=true&w=majority&appName=nextsoft-cluster'),

    ScheduleModule.forRoot(),

    MonitoringModule,
  ],
})
export class AppModule {}
