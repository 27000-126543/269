import ExcelJS from 'exceljs';
import path from 'path';
import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import { PayrollRecord, Employee, Department } from '../types';

const logger = createModuleLogger('HistoryQuery');

export interface QueryFilters {
  employeeIds?: string[];
  departmentId?: string;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
  status?: string;
}

export class HistoryQueryService {
  queryPayrollRecords(filters: QueryFilters): PayrollRecord[] {
    logger.info('Querying payroll history with filters', filters);

    let records: PayrollRecord[] = [];

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      for (const empId of filters.employeeIds) {
        records.push(...dataStore.getPayrollByEmployee(empId));
      }
    } else if (filters.departmentId && filters.startYear && filters.startMonth) {
      const endYear = filters.endYear || filters.startYear;
      const endMonth = filters.endMonth || 12;

      for (let y = filters.startYear; y <= endYear; y++) {
        const startM = y === filters.startYear ? filters.startMonth : 1;
        const endM = y === endYear ? endMonth : 12;
        for (let m = startM; m <= endM; m++) {
          records.push(...dataStore.getPayrollByDepartment(filters.departmentId, y, m));
        }
      }
    } else if (filters.startYear && filters.startMonth) {
      const endYear = filters.endYear || filters.startYear;
      const endMonth = filters.endMonth || 12;

      for (let y = filters.startYear; y <= endYear; y++) {
        const startM = y === filters.startYear ? filters.startMonth : 1;
        const endM = y === endYear ? endMonth : 12;
        for (let m = startM; m <= endM; m++) {
          records.push(...dataStore.getPayrollByMonth(y, m));
        }
      }
    } else {
      const employees = dataStore.getAllEmployees();
      for (const emp of employees) {
        records.push(...dataStore.getPayrollByEmployee(emp.id));
      }
    }

    if (filters.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    if (filters.startYear && filters.startMonth) {
      const startKey = filters.startYear * 100 + filters.startMonth;
      records = records.filter((r) => r.year * 100 + r.month >= startKey);
    }
    if (filters.endYear && filters.endMonth) {
      const endKey = filters.endYear * 100 + filters.endMonth;
      records = records.filter((r) => r.year * 100 + r.month <= endKey);
    }

    records.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return a.employeeId.localeCompare(b.employeeId);
    });

    return records;
  }

  async batchExportToExcel(filters: QueryFilters): Promise<{
    filePath: string;
    recordCount: number;
  }> {
    const records = this.queryPayrollRecords(filters);

    if (records.length === 0) {
      throw new Error('没有符合条件的记录');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '薪酬管理系统';
    workbook.created = new Date();

    const detailSheet = workbook.addWorksheet('薪酬明细');
    detailSheet.columns = [
      { header: '年份', key: 'year', width: 8 },
      { header: '月份', key: 'month', width: 8 },
      { header: '工号', key: 'employeeNo', width: 12 },
      { header: '姓名', key: 'name', width: 10 },
      { header: '部门', key: 'department', width: 15 },
      { header: '职位', key: 'position', width: 15 },
      { header: '应发工资', key: 'grossSalary', width: 12 },
      { header: '社保个人', key: 'ssEmployee', width: 12 },
      { header: '社保企业', key: 'ssEmployer', width: 12 },
      { header: '公积金个人', key: 'hfEmployee', width: 12 },
      { header: '公积金企业', key: 'hfEmployer', width: 12 },
      { header: '个税', key: 'tax', width: 10 },
      { header: '实发工资', key: 'netSalary', width: 12 },
      { header: '状态', key: 'status', width: 10 },
    ];

    const employeeCache = new Map<string, Employee | null>();
    const departmentCache = new Map<string, Department | null>();

    for (const record of records) {
      let employee = employeeCache.get(record.employeeId);
      if (employee === undefined) {
        employee = dataStore.getEmployee(record.employeeId);
        employeeCache.set(record.employeeId, employee);
      }

      let department: Department | null = null;
      if (employee) {
        department = departmentCache.get(employee.departmentId) || null;
        if (!department) {
          department = dataStore.getDepartment(employee.departmentId);
          if (department) departmentCache.set(employee.departmentId, department);
        }
      }

      detailSheet.addRow({
        year: record.year,
        month: record.month,
        employeeNo: employee?.employeeNo || '',
        name: employee?.name || '',
        department: department?.name || '',
        position: employee?.position || '',
        grossSalary: record.grossSalary,
        ssEmployee: record.socialSecurityEmployee,
        ssEmployer: record.socialSecurityEmployer,
        hfEmployee: record.housingFundEmployee,
        hfEmployer: record.housingFundEmployer,
        tax: record.taxWithheld,
        netSalary: record.netSalary,
        status: this.getStatusText(record.status),
      });
    }

    const summarySheet = workbook.addWorksheet('汇总');
    summarySheet.columns = [
      { header: '统计项', key: 'item', width: 25 },
      { header: '数值', key: 'value', width: 20 },
    ];

    const totalGross = records.reduce((sum, r) => sum + r.grossSalary, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netSalary, 0);
    const totalTax = records.reduce((sum, r) => sum + r.taxWithheld, 0);
    const totalSSEmp = records.reduce((sum, r) => sum + r.socialSecurityEmployee, 0);
    const totalSSEmployer = records.reduce((sum, r) => sum + r.socialSecurityEmployer, 0);
    const totalHFEmp = records.reduce((sum, r) => sum + r.housingFundEmployee, 0);
    const totalHFEmployer = records.reduce((sum, r) => sum + r.housingFundEmployer, 0);

    summarySheet.addRows([
      { item: '记录总数', value: records.length },
      { item: '应发工资总额', value: totalGross.toFixed(2) },
      { item: '实发工资总额', value: totalNet.toFixed(2) },
      { item: '个税总额', value: totalTax.toFixed(2) },
      { item: '社保-个人部分总额', value: totalSSEmp.toFixed(2) },
      { item: '社保-企业部分总额', value: totalSSEmployer.toFixed(2) },
      { item: '公积金-个人部分总额', value: totalHFEmp.toFixed(2) },
      { item: '公积金-企业部分总额', value: totalHFEmployer.toFixed(2) },
      { item: '企业成本总额', value: (totalGross + totalSSEmployer + totalHFEmployer).toFixed(2) },
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    const exportDir = config.paths.exportsDir;
    const fileName = `payroll_export_${timestamp}_${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'batch_export',
      module: 'history_query',
      details: {
        filters,
        recordCount: records.length,
        filePath,
      },
    });

    logger.info(`Batch export completed: ${filePath}, ${records.length} records`);

    return { filePath, recordCount: records.length };
  }

  getFrozenRecords(year: number, month: number): PayrollRecord[] {
    const records = dataStore.getPayrollByMonth(year, month);
    return records.filter((r) => r.status === 'frozen');
  }

  getWarningSummary(year: number, month: number): {
    totalWarnings: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    frozenCount: number;
  } {
    const records = dataStore.getPayrollByMonth(year, month);
    let totalWarnings = 0;
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let frozenCount = 0;

    for (const record of records) {
      if (record.status === 'frozen') frozenCount++;

      for (const warning of record.warnings) {
        totalWarnings++;
        byType[warning.type] = (byType[warning.type] || 0) + 1;
        bySeverity[warning.severity] = (bySeverity[warning.severity] || 0) + 1;
      }
    }

    return { totalWarnings, byType, bySeverity, frozenCount };
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      calculated: '已计算',
      approved: '已审批',
      rejected: '已驳回',
      frozen: '已冻结',
      paid: '已发放',
    };
    return statusMap[status] || status;
  }
}

export const historyQueryService = new HistoryQueryService();
