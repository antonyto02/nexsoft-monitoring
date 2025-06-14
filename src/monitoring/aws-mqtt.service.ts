import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvironmentLog, EnvironmentLogDocument } from './environment-log.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { Status, StatusDocument } from './status.schema';
import * as mqtt from 'mqtt';
import * as fs from 'fs';

@Injectable()
export class AwsMqttService implements OnModuleInit {
  private client: mqtt.MqttClient;

  constructor(
    @InjectModel(EnvironmentLog.name)
    private readonly logModel: Model<EnvironmentLogDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(Status.name)
    private readonly statusModel: Model<StatusDocument>,
  ) {}

  onModuleInit() {
    this.connect();
  }

  private connect() {
    console.log('⌛ Conectando a AWS IoT Core...');

    const getEnvOrThrow = (name: string): string => {
      const value = process.env[name];
      if (!value) {
        throw new Error(`❌ FALTA VARIABLE DE ENTORNO: ${name}`);
      }
      return value;
    };

    const key = Buffer.from(getEnvOrThrow('DEVICE_KEY'), 'utf-8');
    const cert = Buffer.from(getEnvOrThrow('DEVICE_CERT'), 'utf-8');
    const ca = Buffer.from(getEnvOrThrow('CA_CERT'), 'utf-8');

    this.client = mqtt.connect({
      host: 'a32p2sd11gkckn-ats.iot.us-east-2.amazonaws.com',
      port: 8883,
      protocol: 'mqtts',
      key,
      cert,
      ca,
      clientId: 'nexsoft-monitoring',
      rejectUnauthorized: true,
    });

    this.client.on('connect', () => {
      console.log('✅ Conectado a AWS IoT Core');
      this.client.subscribe(
        [
          'nexsoft/monitoring/enviroment',
          'nexsoft/monitoring/notifications',
          'nexsoft/monitoring/status',
        ],
        (err) => {
          if (err) console.error('❌ Error al suscribirse:', err);
          else console.log('📡 Suscrito a topics');
        },
      );
    });

    this.client.on('message', async (topic, message) => {
      const payload = message.toString();
      console.log(`📥 ${topic}: ${payload}`);
      try {
        const data = JSON.parse(payload);
        if (topic === 'nexsoft/monitoring/enviroment') {
          await this.saveData(data);
        } else if (topic === 'nexsoft/monitoring/notifications') {
          await this.saveNotification(data);
        } else if (topic === 'nexsoft/monitoring/status') {
          await this.saveStatus(data);
        }
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

  private async saveNotification(data: any) {
    const { sensorId } = data || {};
    if (sensorId === 'esp32_mq2') {
      const { value, gasDetected } = data;
      if (typeof value !== 'number' || gasDetected !== true) {
        throw new Error('Invalid gas notification payload');
      }
      await this.notificationModel.create({
        type: 'Gas',
        sensorId: 'MQ-2',
        message: 'Gas peligroso detectado en el almacén',
        ppm: value,
        status: 'unread',
      });
    } else if (sensorId === 'esp32_vibration') {
      const { alert } = data;
      if (alert !== 'shock_detected') {
        throw new Error('Invalid vibration notification payload');
      }
      await this.notificationModel.create({
        type: 'Vibration',
        sensorId: 'Shock_sensor',
        message: 'Movimiento brusco detetcado en caja',
        status: 'unread',
      });
    } else {
      throw new Error('Invalid sensorId');
    }
  }

  private async saveStatus(data: any) {
    const { sensorId, status } = data || {};
    if (typeof sensorId !== 'string' || typeof status !== 'string') {
      throw new Error('Invalid status payload');
    }
    await this.statusModel.create({
      sensorId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
