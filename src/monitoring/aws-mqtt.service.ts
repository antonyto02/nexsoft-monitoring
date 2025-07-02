import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EnvironmentLog,
  EnvironmentLogDocument,
} from './environment-log.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { Status, StatusDocument } from './status.schema';
import * as mqtt from 'mqtt';
import * as fs from 'fs';

@Injectable()
export class AwsMqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private isConnected = false;

  constructor(
    @InjectModel(EnvironmentLog.name)
    private readonly logModel: Model<EnvironmentLogDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(Status.name)
    private readonly statusModel: Model<StatusDocument>,
  ) {
    console.log('🛠️ Constructor AwsMqttService');
  }

  onModuleInit() {
    console.log('🚀 onModuleInit AwsMqttService');
    this.connect();
  }

  private connect() {
    if (this.isConnected) {
      console.log('⚠️ Ya conectado, omitiendo reconexión.');
      return;
    }

    const mode = process.env.MQTT_MODE || 'local';

    if (mode === 'local') {
      console.log('🔌 Conectando a Mosquitto local...');

      this.client = mqtt.connect({
        host: process.env.MQTT_LOCAL_HOST || 'localhost',
        port: Number(process.env.MQTT_LOCAL_PORT || 1883),
        protocol: (process.env.MQTT_LOCAL_PROTOCOL as 'mqtt') || 'mqtt',
        clientId:
          process.env.MQTT_LOCAL_CLIENT_ID || 'nexsoft-monitoring-local',
        reconnectPeriod: 1000,
      });
    } else if (mode === 'prod') {
      console.log('🔐 Conectando a AWS IoT Core...');

      const readCert = (envVar: string, fallbackPath: string): Buffer => {
        const value = process.env[envVar];
        if (value) {
          console.log(`🔐 Usando certificado desde variable ${envVar}`);
          return Buffer.from(value, 'utf-8');
        }
        console.log(`📄 Usando certificado desde archivo ${fallbackPath}`);
        return fs.readFileSync(fallbackPath);
      };

      const key = readCert('DEVICE_KEY', './certs/device-key.pem.key');
      const cert = readCert('DEVICE_CERT', './certs/device-cert.pem.crt');
      const ca = readCert('CA_CERT', './certs/AmazonRootCA1.pem');

      this.client = mqtt.connect({
        host: process.env.MQTT_AWS_HOST,
        port: Number(process.env.MQTT_AWS_PORT || 8883),
        protocol: process.env.MQTT_AWS_PROTOCOL as 'mqtts',
        key,
        cert,
        ca,
        clientId: process.env.MQTT_AWS_CLIENT_ID || 'nexsoft-monitoring',
        rejectUnauthorized: true,
        reconnectPeriod: 0,
      });
    } else {
      throw new Error(`❌ Modo MQTT desconocido: ${mode}`);
    }

    this.client.on('connect', () => {
      if (this.isConnected) return;
      this.isConnected = true;

      const label = mode === 'local' ? 'Mosquitto local' : 'AWS IoT Core';
      console.log(`✅ Conectado a ${label}`);

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

    this.client.on('message', (topic, message) => {
      void this.handleMessage(topic, message);
    });

    this.client.on('error', (err) => {
      console.error('❌ Error de conexión MQTT:', err.message);
    });
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    const payload = message.toString();
    console.log(`📥 ${topic}: ${payload}`);
    try {
      const data: unknown = JSON.parse(payload);
      if (topic === 'nexsoft/monitoring/enviroment') {
        await this.saveData(data as Record<string, unknown>);
      } else if (topic === 'nexsoft/monitoring/notifications') {
        await this.saveNotification(data as Record<string, unknown>);
      } else if (topic === 'nexsoft/monitoring/status') {
        await this.saveStatus(data as Record<string, unknown>);
      }
    } catch (err) {
      const error = err as Error;
      console.error('❌ Error procesando el mensaje:', error.message);
    }
  }

  private async saveData(data: Record<string, unknown>) {
    const { sensorId, temperature, humidity } = data ?? {};
    if (
      typeof sensorId !== 'string' ||
      typeof temperature !== 'number' ||
      typeof humidity !== 'number'
    ) {
      throw new Error('Invalid data payload');
    }
    await this.logModel.create({ sensorId, temperature, humidity });
  }

  private async saveNotification(data: Record<string, unknown>) {
    const { sensorId } = data ?? {};
    if (sensorId === 'esp32_mq2') {
      const { value, gasDetected } = data as Record<string, unknown>;
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
      const { alert } = data as Record<string, unknown>;
      if (alert !== 'shock_detected') {
        throw new Error('Invalid vibration notification payload');
      }
      await this.notificationModel.create({
        type: 'Vibration',
        sensorId: 'Shock_sensor',
        message: 'Movimiento brusco detectado en caja',
        status: 'unread',
      });
    } else {
      throw new Error('Invalid sensorId');
    }
  }

  private async saveStatus(data: Record<string, unknown>) {
    const { sensorId, status } = data ?? {};
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
