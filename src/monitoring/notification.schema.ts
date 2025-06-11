import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ collection: 'notifications' })
export class Notification {
  @Prop({ required: true, enum: ['gas', 'vibration'] })
  type: 'gas' | 'vibration';

  @Prop({ required: true })
  sensorId: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  ppm?: number;

  @Prop()
  intensity?: number;

  @Prop({ required: true, enum: ['read', 'unread'], default: 'unread' })
  status: 'read' | 'unread';

  @Prop({ default: () => new Date() })
  timestamp: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
