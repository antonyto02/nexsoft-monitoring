import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config'; // ✅ IMPORTANTE

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ HABILITA EL USO DE .env

    MongooseModule.forRoot(process.env.MONGO_URI!),


    MonitoringModule,
    AuthModule,
  ],
})
export class AppModule {}
