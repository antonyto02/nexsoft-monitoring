import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://antonyto02:T6DfHvPfMLXLCu4k@nextsoft-cluster.k7wjxb9.mongodb.net/?retryWrites=true&w=majority&appName=nextsoft-cluster'),
  ],
})
export class AppModule {}
