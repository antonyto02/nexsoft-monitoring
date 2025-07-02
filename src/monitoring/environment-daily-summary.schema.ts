import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnvironmentDailySummaryDocument = EnvironmentDailySummary &
  Document;

@Schema({ collection: 'environment_daily_summary' })
export class EnvironmentDailySummary {
  @Prop({ required: true })
  day: Date;

  @Prop({ required: true })
  avgTemperature: number;

  @Prop({ required: true })
  avgHumidity: number;
}

export const EnvironmentDailySummarySchema = SchemaFactory.createForClass(
  EnvironmentDailySummary,
);
