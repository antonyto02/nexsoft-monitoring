import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { Notification, NotificationDocument } from './notification.schema';
import { Status, StatusDocument } from './status.schema';

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
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(Status.name)
    private readonly statusModel: Model<StatusDocument>,
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
        timeField: 'timestamp',
        tempField: 'temperature',
        humField: 'humidity',
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

    const latest = await this.logModel
      .findOne()
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    const current = latest?.temperature ?? null;
    const average =
      result.average !== null && result.average !== undefined
        ? parseFloat(result.average.toFixed(1))
        : null;

    const temperature = result.series.map((d) => ({
      time: d.time,
      value: parseFloat(d.value.toFixed(1)),
    }));

    return {
      message: 'Data retrieved successfully',
      current,
      average,
      min: result.min,
      max: result.max,
      temperature,
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

  async getHomeData() {
    const latest = await this.logModel
      .findOne()
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    const temp = latest?.temperature ?? null;
    const hum = latest?.humidity ?? null;

    const notifs = await this.notificationModel
      .find({ status: 'unread' })
      .sort({ timestamp: 1 })
      .lean()
      .exec();

    const filtered: typeof notifs = [];
    const lastMap = new Map<string, Date>();
    for (const n of notifs) {
      const key = `${n.sensorId}-${n.type}`;
      const last = lastMap.get(key);
      if (!last || n.timestamp.getTime() - last.getTime() >= 10000) {
        filtered.push(n);
        lastMap.set(key, n.timestamp);
      }
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const unreadNotifications = filtered.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      message: n.message,
      status: n.status,
      timestamp: n.timestamp.toISOString(),
    }));

    return {
      message: 'Data retrieved successfully',
      temperature: temp,
      humidity: hum,
      unread_notifications: unreadNotifications,
    };
  }

  async getSensorsStatus() {
    const now = Date.now();

    const dht = await this.statusModel
      .findOne({ sensorId: 'esp32_dht11' })
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    const vibration = await this.statusModel
      .findOne({ sensorId: 'esp32_vibration' })
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    let envStatus: 'ok' | 'offline' = 'offline';
    if (dht) {
      const diff = now - new Date(dht.timestamp).getTime();
      if (diff < 20000) {
        envStatus = 'ok';
      }
    }

    let vibrationStatus: 'ok' | 'offline' = 'offline';
    if (vibration) {
      const diff = now - new Date(vibration.timestamp).getTime();
      if (diff < 20000) {
        vibrationStatus = 'ok';
      }
    }

    const sensors = [
      { sensor: 'temperature', status: envStatus },
      { sensor: 'humidity', status: envStatus },
      { sensor: 'gas', status: envStatus },
      { sensor: 'vibration', status: vibrationStatus },
    ];

    return {
      message: 'Data retrieved successfully',
      sensors,
    };
  }

  async getNotifications(
    sensorType = 'all',
    readStatus = 'all',
    page = 1,
    limit = 20,
  ) {
    const allowedSensor = ['Gas', 'Vibration', 'all'];
    const allowedStatus = ['read', 'unread', 'all'];

    if (!allowedSensor.includes(sensorType)) {
      throw new BadRequestException('Invalid sensor_type value');
    }
    if (!allowedStatus.includes(readStatus)) {
      throw new BadRequestException('Invalid read_status value');
    }

    const filter: Record<string, unknown> = {};
    if (sensorType !== 'all') {
      filter.type = sensorType;
    }
    if (readStatus !== 'all') {
      filter.status = readStatus;
    }

    const total = await this.notificationModel.countDocuments(filter).exec();
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const skip = (page - 1) * limit;

    const docs = await this.notificationModel
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const notifications = docs.map((d) => ({
      id: d._id.toString(),
      sensor: d.type,
      message: d.message,
      timestamp: d.timestamp.toISOString(),
      status: d.status,
    }));

    const nextPage = page < totalPages ? page + 1 : null;

    return {
      message: 'Data retrieved successfully',
      notifications,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        next_page: nextPage,
        limit,
      },
    };
  }

  async markNotificationRead(id: string) {
    const doc = await this.notificationModel
      .findByIdAndUpdate(id, { status: 'read' }, { new: true })
      .exec();
    if (!doc) {
      throw new NotFoundException('Notification not found');
    }
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
      time: new Date(d[config.timeField]).toISOString(),
      value: d[valueField] as number,
    }));


    return { current, average, min, max, series };
  }
}
