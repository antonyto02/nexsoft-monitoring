import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StatusDocument = Status & Document;

@Schema({ collection: 'status' })
export class Status {
  @Prop({ required: true })
  sensorId: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  timestamp: string;
}

export const StatusSchema = SchemaFactory.createForClass(Status);
