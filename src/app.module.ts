import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config'; // ✅ IMPORTANTE

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ HABILITA EL USO DE .env

    MongooseModule.forRoot('mongodb+srv://antonyto02:T6DfHvPfMLXLCu4k@nextsoft-cluster.k7wjxb9.mongodb.net/MonitoringDB?retryWrites=true&w=majority&appName=nextsoft-cluster'),

    MonitoringModule,
    AuthModule,
  ],
})
export class AppModule {}
