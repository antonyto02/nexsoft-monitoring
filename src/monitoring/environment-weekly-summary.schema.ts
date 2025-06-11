import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnvironmentWeeklySummaryDocument = EnvironmentWeeklySummary & Document;

@Schema({ collection: 'environment_weekly_summary' })
export class EnvironmentWeeklySummary {
  @Prop({ required: true })
  weekStart: Date;

  @Prop({ required: true })
  avgTemperature: number;

  @Prop({ required: true })
  avgHumidity: number;
}

export const EnvironmentWeeklySummarySchema = SchemaFactory.createForClass(EnvironmentWeeklySummary);
