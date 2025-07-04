import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnvironmentLogDocument = EnvironmentLog & Document;

@Schema({ collection: 'environment_logs' })
export class EnvironmentLog {
  @Prop({ required: true })
  sensorId: string;

  @Prop({ required: true })
  temperature: number;

  @Prop({ required: true })
  humidity: number;

  @Prop({ default: () => new Date() })
  timestamp: Date;
}

export const EnvironmentLogSchema =
  SchemaFactory.createForClass(EnvironmentLog);
