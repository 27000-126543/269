import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import { AttendanceRecord, PerformanceRecord, SalesCommission } from '../types';

const logger = createModuleLogger('DataFetcher');

export interface FetchResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  count: number;
}

export class DataFetcher {
  async fetchAttendance(year: number, month: number): Promise<FetchResult<AttendanceRecord>> {
    logger.info(`Fetching attendance data for ${year}-${month}`);
    const errors: string[] = [];

    try {
      const records = dataStore.getAttendanceByMonth(year, month);
      logger.info(`Fetched ${records.length} attendance records`);

      dataStore.addAuditLog({
        userId: 'system',
        userName: 'System',
        action: 'fetch_attendance',
        module: 'data_fetcher',
        details: { year, month, count: records.length },
      });

      return {
        success: true,
        data: records,
        errors,
        count: records.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error(`Failed to fetch attendance data: ${message}`);
      return {
        success: false,
        data: [],
        errors,
        count: 0,
      };
    }
  }

  async fetchPerformance(year: number, month: number): Promise<FetchResult<PerformanceRecord>> {
    logger.info(`Fetching performance data for ${year}-${month}`);
    const errors: string[] = [];

    try {
      const records = dataStore.getPerformanceByMonth(year, month);
      logger.info(`Fetched ${records.length} performance records`);

      dataStore.addAuditLog({
        userId: 'system',
        userName: 'System',
        action: 'fetch_performance',
        module: 'data_fetcher',
        details: { year, month, count: records.length },
      });

      return {
        success: true,
        data: records,
        errors,
        count: records.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error(`Failed to fetch performance data: ${message}`);
      return {
        success: false,
        data: [],
        errors,
        count: 0,
      };
    }
  }

  async fetchSalesCommission(year: number, month: number): Promise<FetchResult<SalesCommission>> {
    logger.info(`Fetching sales commission data for ${year}-${month}`);
    const errors: string[] = [];

    try {
      const records = dataStore.getSalesCommissionByMonth(year, month);
      logger.info(`Fetched ${records.length} sales commission records`);

      dataStore.addAuditLog({
        userId: 'system',
        userName: 'System',
        action: 'fetch_sales_commission',
        module: 'data_fetcher',
        details: { year, month, count: records.length },
      });

      return {
        success: true,
        data: records,
        errors,
        count: records.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error(`Failed to fetch sales commission data: ${message}`);
      return {
        success: false,
        data: [],
        errors,
        count: 0,
      };
    }
  }

  async fetchAllData(
    year: number,
    month: number
  ): Promise<{
    attendance: FetchResult<AttendanceRecord>;
    performance: FetchResult<PerformanceRecord>;
    sales: FetchResult<SalesCommission>;
  }> {
    logger.info(`Fetching all data for ${year}-${month}`);

    const [attendance, performance, sales] = await Promise.all([
      this.fetchAttendance(year, month),
      this.fetchPerformance(year, month),
      this.fetchSalesCommission(year, month),
    ]);

    return { attendance, performance, sales };
  }

  validateAttendanceData(records: AttendanceRecord[]): string[] {
    const errors: string[] = [];
    const employeeIds = new Set(dataStore.getActiveEmployees().map((e) => e.id));

    records.forEach((record) => {
      if (!employeeIds.has(record.employeeId)) {
        errors.push(`Attendance record ${record.id}: Employee ${record.employeeId} not found or inactive`);
      }
      if (record.workDays < 0 || record.workDays > 31) {
        errors.push(`Attendance record ${record.id}: Invalid work days ${record.workDays}`);
      }
      if (record.absentDays > record.standardWorkDays) {
        errors.push(`Attendance record ${record.id}: Absent days exceed standard work days`);
      }
    });

    return errors;
  }

  validatePerformanceData(records: PerformanceRecord[]): string[] {
    const errors: string[] = [];
    const validLevels = new Set(['S', 'A', 'B', 'C', 'D']);
    const employeeIds = new Set(dataStore.getActiveEmployees().map((e) => e.id));

    records.forEach((record) => {
      if (!employeeIds.has(record.employeeId)) {
        errors.push(`Performance record ${record.id}: Employee ${record.employeeId} not found or inactive`);
      }
      if (!validLevels.has(record.level)) {
        errors.push(`Performance record ${record.id}: Invalid level ${record.level}`);
      }
      if (record.score < 0 || record.score > 100) {
        errors.push(`Performance record ${record.id}: Invalid score ${record.score}`);
      }
      if (record.bonus < 0) {
        errors.push(`Performance record ${record.id}: Negative bonus ${record.bonus}`);
      }
    });

    return errors;
  }

  validateSalesData(records: SalesCommission[]): string[] {
    const errors: string[] = [];
    const employeeIds = new Set(dataStore.getActiveEmployees().map((e) => e.id));

    records.forEach((record) => {
      if (!employeeIds.has(record.employeeId)) {
        errors.push(`Sales record ${record.id}: Employee ${record.employeeId} not found or inactive`);
      }
      if (record.salesAmount < 0) {
        errors.push(`Sales record ${record.id}: Negative sales amount ${record.salesAmount}`);
      }
      if (record.commissionRate < 0 || record.commissionRate > 1) {
        errors.push(`Sales record ${record.id}: Invalid commission rate ${record.commissionRate}`);
      }
      const expectedCommission = record.salesAmount * record.commissionRate;
      if (Math.abs(expectedCommission - record.commissionAmount) > 0.01) {
        errors.push(
          `Sales record ${record.id}: Commission amount mismatch. Expected ${expectedCommission.toFixed(2)}, got ${record.commissionAmount}`
        );
      }
    });

    return errors;
  }
}

export const dataFetcher = new DataFetcher();
