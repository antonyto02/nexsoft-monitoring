import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvironmentLog, EnvironmentLogDocument } from './environment-log.schema';
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
import {
  startOfHour,
  startOfDay,
  startOfWeek,
  subHours,
  subDays,
} from '../utils/date.utils';

@Injectable()
export class AggregationService {
  constructor(
    @InjectModel(EnvironmentLog.name)
    private readonly logModel: Model<EnvironmentLogDocument>,
    @InjectModel(EnvironmentHourlySummary.name)
    private readonly hourlyModel: Model<EnvironmentHourlySummaryDocument>,
    @InjectModel(EnvironmentDailySummary.name)
    private readonly dailyModel: Model<EnvironmentDailySummaryDocument>,
    @InjectModel(EnvironmentWeeklySummary.name)
    private readonly weeklyModel: Model<EnvironmentWeeklySummaryDocument>,
  ) {}

  @Cron('0 0 * * * *')
  async hourlyAggregation() {
    const now = new Date();
    const currentHour = startOfHour(now);
    const hourToSummarize = subHours(currentHour, 1);

    const match = { timestamp: { $gte: hourToSummarize, $lt: currentHour } };
    const result = await this.logModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            avgTemperature: { $avg: '$temperature' },
            avgHumidity: { $avg: '$humidity' },
          },
        },
      ])
      .exec();

    if (result.length > 0) {
      await this.hourlyModel.create({
        hour: hourToSummarize,
        avgTemperature: result[0].avgTemperature,
        avgHumidity: result[0].avgHumidity,
      });
    }

    const oldStart = subHours(hourToSummarize, 1);
    const oldEnd = hourToSummarize;
    await this.logModel.deleteMany({ timestamp: { $gte: oldStart, $lt: oldEnd } });
  }

  @Cron('0 0 0 * * *')
  async dailyAggregation() {
    const now = new Date();
    const today = startOfDay(now);
    const dayToSummarize = subDays(today, 1);

    const result = await this.hourlyModel
      .aggregate([
        { $match: { hour: { $gte: dayToSummarize, $lt: today } } },
        {
          $group: {
            _id: null,
            avgTemperature: { $avg: '$avgTemperature' },
            avgHumidity: { $avg: '$avgHumidity' },
          },
        },
      ])
      .exec();

    if (result.length > 0) {
      await this.dailyModel.create({
        day: dayToSummarize,
        avgTemperature: result[0].avgTemperature,
        avgHumidity: result[0].avgHumidity,
      });
    }

    await this.hourlyModel.deleteMany({ hour: { $gte: dayToSummarize, $lt: today } });

    const dailyCount = await this.dailyModel.countDocuments();
    if (dailyCount > 31) {
      const excess = dailyCount - 31;
      const oldRecords = await this.dailyModel.find().sort({ day: 1 }).limit(excess);
      await this.dailyModel.deleteMany({ _id: { $in: oldRecords.map((r) => r._id) } });
    }
  }

  @Cron('0 0 0 * * 1')
  async weeklyAggregation() {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const weekToSummarizeStart = subDays(thisWeekStart, 7);

    const result = await this.dailyModel
      .aggregate([
        { $match: { day: { $gte: weekToSummarizeStart, $lt: thisWeekStart } } },
        {
          $group: {
            _id: null,
            avgTemperature: { $avg: '$avgTemperature' },
            avgHumidity: { $avg: '$avgHumidity' },
          },
        },
      ])
      .exec();

    if (result.length > 0) {
      await this.weeklyModel.create({
        weekStart: weekToSummarizeStart,
        avgTemperature: result[0].avgTemperature,
        avgHumidity: result[0].avgHumidity,
      });
    }

    const weeklyCount = await this.weeklyModel.countDocuments();
    if (weeklyCount > 13) {
      const excess = weeklyCount - 13;
      const oldRecords = await this.weeklyModel.find().sort({ weekStart: 1 }).limit(excess);
      await this.weeklyModel.deleteMany({ _id: { $in: oldRecords.map((r) => r._id) } });
    }
  }
}

