import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvironmentLog, EnvironmentLogDocument } from './environment-log.schema';
import * as mqtt from 'mqtt';
import * as fs from 'fs';

@Injectable()
export class AwsMqttService implements OnModuleInit {
  private client: mqtt.MqttClient;

  constructor(
    @InjectModel(EnvironmentLog.name) private readonly logModel: Model<EnvironmentLogDocument>,
  ) {}

  onModuleInit() {
    this.connect();
  }

  private connect() {
    console.log('⌛ Conectando a AWS IoT Core...');
    this.client = mqtt.connect({
      host: 'a32p2sd11gkckn-ats.iot.us-east-2.amazonaws.com',
      port: 8883,
      protocol: 'mqtts',
      key: fs.readFileSync('./certs/device-key.pem.key'),
      cert: fs.readFileSync('./certs/device-cert.pem.crt'),
      ca: fs.readFileSync('./certs/AmazonRootCA1.pem'),
      clientId: 'nexsoft-monitoring',
    });

    this.client.on('connect', () => {
      console.log('✅ Conectado a AWS IoT Core');
      this.client.subscribe('nexsoft/monitoring/enviroment', (err) => {
        if (err) console.error('❌ Error al suscribirse:', err);
        else console.log('📡 Suscrito al topic');
      });
    });

    this.client.on('message', async (topic, message) => {
      const payload = message.toString();
      console.log(`📥 ${topic}: ${payload}`);
      try {
        const data = JSON.parse(payload);
        await this.saveData(data);
      } catch (err) {
        console.error('❌ Error procesando el mensaje:', err.message);
      }
    });

    this.client.on('error', (err) => {
      console.error('❌ Error de conexión:', err);
    });
  }

  private async saveData(data: any) {
    const { sensorId, temperature, humidity } = data || {};
    if (
      typeof sensorId !== 'string' ||
      typeof temperature !== 'number' ||
      typeof humidity !== 'number'
    ) {
      throw new Error('Invalid data payload');
    }
    await this.logModel.create({ sensorId, temperature, humidity });
  }
}
