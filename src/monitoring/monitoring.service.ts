import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EnvironmentLog,
  EnvironmentLogDocument,
} from './environment-log.schema';
import {
  EnvironmentHourlySummary,
  EnvironmentHourlySummaryDocument,
} from './environment-hourly-summary.schema';
import {
  EnvironmentDailySummary,
  EnvironmentDailySummaryDocument,
} from './environment-daily-summary.schema';
import {
  EnvironmentWeeklySummary,
  EnvironmentWeeklySummaryDocument,
} from './environment-weekly-summary.schema';

interface FilterConfig {
  model: Model<any>;
  timeField: string;
  tempField: string;
  humField: string;
  points: number;
}

@Injectable()
export class MonitoringService {
  private readonly filterMap: Record<string, FilterConfig>;

  constructor(
    @InjectModel(EnvironmentLog.name)
    private readonly logModel: Model<EnvironmentLogDocument>,
    @InjectModel(EnvironmentHourlySummary.name)
    private readonly hourlyModel: Model<EnvironmentHourlySummaryDocument>,
    @InjectModel(EnvironmentDailySummary.name)
    private readonly dailyModel: Model<EnvironmentDailySummaryDocument>,
    @InjectModel(EnvironmentWeeklySummary.name)
    private readonly weeklyModel: Model<EnvironmentWeeklySummaryDocument>,
  ) {
    this.filterMap = {
      last_5min: {
        model: this.logModel,
        timeField: 'timestamp',
        tempField: 'temperature',
        humField: 'humidity',
        points: 30,
      },
      '24h': {
        model: this.hourlyModel,
        timeField: 'hour',
        tempField: 'avgTemperature',
        humField: 'avgHumidity',
        points: 24,
      },

      last_week: {
        model: this.dailyModel,
        timeField: 'timestamp',
        tempField: 'temperature',
        humField: 'humidity',
        points: 7,
      },
      last_month: {
        model: this.dailyModel,
        timeField: 'timestamp',
        tempField: 'temperature',
        humField: 'humidity',
        points: 30,
      },
      last_3months: {
        model: this.weeklyModel,
        timeField: 'timestamp',
        tempField: 'temperature',
        humField: 'humidity',
        points: 13,
      },  


    } as const;
  }

  async getTemperatureGraph(filter: string) {
    const result = await this.getData(filter, 'temperature');
    return {
      message: 'Data retrieved successfully',
      current: result.current,
      average: result.average,
      min: result.min,
      max: result.max,
      temperature: result.series,
    };
  }

  async getHumidityGraph(filter: string) {
    const result = await this.getData(filter, 'humidity');
    return {
      message: 'Data retrieved successfully',
      current: result.current,
      average: result.average,
      min: result.min,
      max: result.max,
      humidity: result.series,
    };
  }

  private async getData(filter: string, type: 'temperature' | 'humidity') {
    const config = this.filterMap[filter as keyof typeof this.filterMap];
    if (!config) {
      throw new BadRequestException(
        'Invalid filter value. Allowed values: 24h, last_5min, last_week, last_month, last_3months',
      );
    }

    const docs = await config.model
      .find()
      .sort({ [config.timeField]: -1 })
      .limit(config.points)
      .lean()
      .exec();

    docs.reverse();

    const valueField =
      type === 'temperature' ? config.tempField : config.humField;
    const values = docs.map((d) => d[valueField] as number);

    const current = values[values.length - 1] ?? null;
    const average =
      values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : null;
    const min = values.length > 0 ? Math.min(...values) : null;
    const max = values.length > 0 ? Math.max(...values) : null;

    const series = docs.map((d) => ({
      time: (d[config.timeField] as Date).toISOString(),
      value: d[valueField] as number,
    }));

    return { current, average, min, max, series };
  }
}
