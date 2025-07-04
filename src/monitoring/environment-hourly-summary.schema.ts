import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnvironmentHourlySummaryDocument = EnvironmentHourlySummary &
  Document;

@Schema({ collection: 'environment_hourly_summary' })
export class EnvironmentHourlySummary {
  @Prop({ required: true })
  hour: Date;

  @Prop({ required: true })
  avgTemperature: number;

  @Prop({ required: true })
  avgHumidity: number;
}

export const EnvironmentHourlySummarySchema = SchemaFactory.createForClass(
  EnvironmentHourlySummary,
);
