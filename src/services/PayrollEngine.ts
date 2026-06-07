import pLimit from 'p-limit';
import { dataStore } from '../store/DataStore';
import { salaryCalculator } from './SalaryCalculator';
import { taxCalculator } from './TaxCalculator';
import { dataFetcher } from './DataFetcher';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import {
  PayrollRecord,
  Employee,
  SpecialDeduction,
  WarningItem,
  DepartmentPayrollSummary,
  YearEndBonus,
} from '../types';
import { WARNING_THRESHOLD, APPROVAL_THRESHOLDS } from '../config/policies';

const logger = createModuleLogger('PayrollEngine');

export class PayrollEngine {
  private limit: any;

  constructor() {
    this.limit = pLimit(config.performance.maxConcurrentEmployees);
  }

  getDefaultSpecialDeductions(): SpecialDeduction {
    return {
      childEducation: 0,
      continuingEducation: 0,
      housingLoanInterest: 0,
      housingRent: 0,
      elderlySupport: 0,
      infantCare: 0,
      total: 0,
    };
  }

  async getCumulativeTaxData(employeeId: string, year: number, month: number): Promise<{
    cumulativeTaxableIncome: number;
    cumulativeTaxPaid: number;
  }> {
    const payrolls = dataStore.getPayrollByEmployee(employeeId);
    let cumulativeTaxableIncome = 0;
    let cumulativeTaxPaid = 0;

    for (const payroll of payrolls) {
      if (payroll.year === year && payroll.month < month) {
        cumulativeTaxableIncome += payroll.taxableIncome;
        cumulativeTaxPaid += payroll.taxWithheld;
      } else if (payroll.year < year) {
        break;
      }
    }

    return { cumulativeTaxableIncome, cumulativeTaxPaid };
  }

  async getPreviousMonthPayroll(employeeId: string, year: number, month: number): Promise<PayrollRecord | null> {
    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    return dataStore.getPayrollRecord(employeeId, prevYear, prevMonth);
  }

  checkVarianceWarnings(
    current: PayrollRecord,
    previous: PayrollRecord | null
  ): WarningItem[] {
    const warnings: WarningItem[] = [];

    if (!previous) {
      return warnings;
    }

    if (previous.taxWithheld > 0) {
      const taxVariance = Math.abs(current.taxWithheld - previous.taxWithheld) / previous.taxWithheld;
      if (taxVariance > WARNING_THRESHOLD) {
        warnings.push({
          id: dataStore.generateId(),
          type: 'tax_variance',
          severity: 'high',
          message: `个税差异${(taxVariance * 100).toFixed(1)}%，超过阈值${(WARNING_THRESHOLD * 100)}%`,
          data: {
            previousTax: previous.taxWithheld,
            currentTax: current.taxWithheld,
            variance: taxVariance,
          },
        });
      }
    }

    if (previous.socialSecurityEmployee > 0) {
      const ssVariance = Math.abs(current.socialSecurityEmployee - previous.socialSecurityEmployee) / previous.socialSecurityEmployee;
      if (ssVariance > WARNING_THRESHOLD) {
        warnings.push({
          id: dataStore.generateId(),
          type: 'social_security_variance',
          severity: 'medium',
          message: `社保缴纳差异${(ssVariance * 100).toFixed(1)}%，超过阈值${(WARNING_THRESHOLD * 100)}%`,
          data: {
            previousSS: previous.socialSecurityEmployee,
            currentSS: current.socialSecurityEmployee,
            variance: ssVariance,
          },
        });
      }
    }

    return warnings;
  }

  async calculateEmployeePayroll(
    employee: Employee,
    year: number,
    month: number,
    specialDeductions?: SpecialDeduction,
    yearEndBonus?: YearEndBonus
  ): Promise<PayrollRecord> {
    logger.info(`Calculating payroll for employee ${employee.id} (${employee.name})`);

    const attendance = dataStore.getAttendance(employee.id, year, month) ?? undefined;
    const performance = dataStore.getPerformance(employee.id, year, month) ?? undefined;
    const salesCommission = dataStore.getSalesCommission(employee.id, year, month) ?? undefined;

    const salaryResult = salaryCalculator.calculateGrossSalary(
      employee,
      attendance,
      performance,
      salesCommission
    );

    const sd = specialDeductions || this.getDefaultSpecialDeductions();
    const { validated } = taxCalculator.validateSpecialDeduction(sd);

    const { cumulativeTaxableIncome, cumulativeTaxPaid } = await this.getCumulativeTaxData(
      employee.id,
      year,
      month
    );

    const deductionResult = taxCalculator.calculateAllDeductions(
      employee,
      salaryResult.grossSalary,
      validated,
      cumulativeTaxableIncome,
      cumulativeTaxPaid,
      yearEndBonus
    );

    const netSalary = salaryResult.grossSalary - deductionResult.totalEmployeeDeductions;

    const payrollRecord: PayrollRecord = {
      id: dataStore.generateId(),
      employeeId: employee.id,
      year,
      month,
      earnings: salaryResult.allEarnings,
      deductions: deductionResult.allDeductions,
      grossSalary: salaryResult.grossSalary,
      netSalary: Math.max(0, Math.round(netSalary * 100) / 100),
      taxableIncome: deductionResult.taxableIncome,
      taxWithheld: deductionResult.taxWithheld,
      socialSecurityEmployee: deductionResult.socialSecurityEmployee,
      socialSecurityEmployer: deductionResult.socialSecurityEmployer,
      housingFundEmployee: deductionResult.housingFundEmployee,
      housingFundEmployer: deductionResult.housingFundEmployer,
      specialDeductions: validated,
      yearEndBonus,
      status: 'calculated',
      approvalHistory: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calculatedAt: new Date().toISOString(),
    };

    const previousPayroll = await this.getPreviousMonthPayroll(employee.id, year, month);
    payrollRecord.warnings = this.checkVarianceWarnings(payrollRecord, previousPayroll);

    if (payrollRecord.warnings.some((w) => w.severity === 'high')) {
      payrollRecord.status = 'frozen';
      logger.warn(`Payroll for employee ${employee.id} frozen due to high severity warnings`);
    }

    return payrollRecord;
  }

  async calculateDepartmentSummary(
    departmentId: string,
    year: number,
    month: number
  ): Promise<DepartmentPayrollSummary> {
    logger.info(`Calculating department summary for department ${departmentId}`);

    const department = dataStore.getDepartment(departmentId);
    if (!department) {
      throw new Error(`Department ${departmentId} not found`);
    }

    const payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);
    const budget = department.budget;

    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalSS = 0;
    let totalHF = 0;
    let hasHighWarning = false;

    for (const record of payrollRecords) {
      totalGross += record.grossSalary;
      totalNet += record.netSalary;
      totalTax += record.taxWithheld;
      totalSS += record.socialSecurityEmployee + record.socialSecurityEmployer;
      totalHF += record.housingFundEmployee + record.housingFundEmployer;
      if (record.warnings.some((w) => w.severity === 'high')) {
        hasHighWarning = true;
      }
    }

    totalGross = Math.round(totalGross * 100) / 100;
    totalNet = Math.round(totalNet * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    totalSS = Math.round(totalSS * 100) / 100;
    totalHF = Math.round(totalHF * 100) / 100;

    const budgetUsage = budget > 0 ? totalGross / budget : 0;
    let requiredApprovalLevel = 0;

    if (totalGross > APPROVAL_THRESHOLDS.LEVEL_2) {
      requiredApprovalLevel = 2;
    } else if (totalGross > APPROVAL_THRESHOLDS.LEVEL_1) {
      requiredApprovalLevel = 1;
    }

    const summary: DepartmentPayrollSummary = {
      departmentId,
      departmentName: department.name,
      year,
      month,
      employeeCount: payrollRecords.length,
      totalGross,
      totalNet,
      totalTax,
      totalSocialSecurity: totalSS,
      totalHousingFund: totalHF,
      budget,
      budgetUsage: Math.round(budgetUsage * 10000) / 100,
      approvalStatus: hasHighWarning ? 'frozen' : 'pending',
      requiredApprovalLevel,
    };

    dataStore.saveDepartmentSummary(summary);

    return summary;
  }

  async runPayrollCalculation(
    year: number,
    month: number,
    employeeIds?: string[]
  ): Promise<{
    successCount: number;
    failedCount: number;
    frozenCount: number;
    results: PayrollRecord[];
    errors: { employeeId: string; error: string }[];
  }> {
    logger.info(`Starting payroll calculation for ${year}-${month}`);

    const startTime = Date.now();
    const errors: { employeeId: string; error: string }[] = [];

    let employees: Employee[];
    if (employeeIds && employeeIds.length > 0) {
      employees = employeeIds
        .map((id) => dataStore.getEmployee(id))
        .filter((e): e is Employee => e !== null && e.status === 'active');
    } else {
      employees = dataStore.getActiveEmployees();
    }

    logger.info(`Processing ${employees.length} employees`);

    const tasks = employees.map((employee) =>
      this.limit(async () => {
        try {
          const payroll = await this.calculateEmployeePayroll(employee, year, month);
          dataStore.savePayrollRecord(payroll);
          return payroll;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ employeeId: employee.id, error: message });
          logger.error(`Failed to calculate payroll for employee ${employee.id}: ${message}`);
          return null;
        }
      })
    );

    const results = (await Promise.all(tasks)).filter((r): r is PayrollRecord => r !== null);

    const successCount = results.length;
    const failedCount = errors.length;
    const frozenCount = results.filter((r) => r.status === 'frozen').length;

    const departments = new Set(employees.map((e) => e.departmentId));
    for (const deptId of departments) {
      try {
        await this.calculateDepartmentSummary(deptId, year, month);
      } catch (error) {
        logger.error(`Failed to calculate summary for department ${deptId}`);
      }
    }

    const duration = Date.now() - startTime;

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'run_payroll',
      module: 'payroll_engine',
      details: {
        year,
        month,
        employeeCount: employees.length,
        successCount,
        failedCount,
        frozenCount,
        durationMs: duration,
      },
    });

    logger.info(
      `Payroll calculation completed: ${successCount} success, ${failedCount} failed, ${frozenCount} frozen in ${duration}ms`
    );

    return {
      successCount,
      failedCount,
      frozenCount,
      results,
      errors,
    };
  }

  async getPayrollHistory(options: {
    employeeId?: string;
    departmentId?: string;
    startYear?: number;
    startMonth?: number;
    endYear?: number;
    endMonth?: number;
  }): Promise<PayrollRecord[]> {
    let records: PayrollRecord[];

    if (options.employeeId) {
      records = dataStore.getPayrollByEmployee(options.employeeId);
    } else if (options.departmentId && options.startYear && options.startMonth) {
      records = dataStore.getPayrollByDepartment(
        options.departmentId,
        options.startYear,
        options.startMonth
      );
    } else {
      records = [];
      if (options.startYear && options.startMonth) {
        for (let y = options.startYear; y <= (options.endYear || options.startYear); y++) {
          const startM = y === options.startYear ? options.startMonth : 1;
          const endM = y === (options.endYear || options.startYear) ? (options.endMonth || 12) : 12;
          for (let m = startM; m <= endM; m++) {
            records.push(...dataStore.getPayrollByMonth(y, m));
          }
        }
      }
    }

    if (options.startYear && options.startMonth) {
      const startKey = options.startYear * 100 + options.startMonth;
      records = records.filter((r) => r.year * 100 + r.month >= startKey);
    }
    if (options.endYear && options.endMonth) {
      const endKey = options.endYear * 100 + options.endMonth;
      records = records.filter((r) => r.year * 100 + r.month <= endKey);
    }

    return records;
  }
}

export const payrollEngine = new PayrollEngine();
