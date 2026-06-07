import { Employee, AttendanceRecord, PerformanceRecord, SalesCommission, EarningItem } from '../types';
import { WORKING_DAYS_PER_MONTH, WORKING_HOURS_PER_DAY, OVERTIME_RATES, PERFORMANCE_BONUS_RATES } from '../config/policies';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('SalaryCalculator');

export class SalaryCalculator {
  calculateHourlyRate(baseSalary: number): number {
    return baseSalary / WORKING_DAYS_PER_MONTH / WORKING_HOURS_PER_DAY;
  }

  calculateDailyRate(baseSalary: number): number {
    return baseSalary / WORKING_DAYS_PER_MONTH;
  }

  calculateOvertimePay(
    baseSalary: number,
    overtime: { weekday: number; weekend: number; holiday: number }
  ): { items: EarningItem[]; total: number } {
    const hourlyRate = this.calculateHourlyRate(baseSalary);
    const items: EarningItem[] = [];
    let total = 0;

    if (overtime.weekday > 0) {
      const amount = overtime.weekday * hourlyRate * OVERTIME_RATES.weekday;
      items.push({
        id: `overtime_weekday_${Date.now()}`,
        name: '平日加班费',
        type: 'overtime',
        amount: Math.round(amount * 100) / 100,
        description: `平日加班${overtime.weekday}小时`,
      });
      total += amount;
    }

    if (overtime.weekend > 0) {
      const amount = overtime.weekend * hourlyRate * OVERTIME_RATES.weekend;
      items.push({
        id: `overtime_weekend_${Date.now()}`,
        name: '周末加班费',
        type: 'overtime',
        amount: Math.round(amount * 100) / 100,
        description: `周末加班${overtime.weekend}小时`,
      });
      total += amount;
    }

    if (overtime.holiday > 0) {
      const amount = overtime.holiday * hourlyRate * OVERTIME_RATES.holiday;
      items.push({
        id: `overtime_holiday_${Date.now()}`,
        name: '节假日加班费',
        type: 'overtime',
        amount: Math.round(amount * 100) / 100,
        description: `节假日加班${overtime.holiday}小时`,
      });
      total += amount;
    }

    return { items, total: Math.round(total * 100) / 100 };
  }

  calculateLeaveDeduction(
    baseSalary: number,
    leaveDays: { personal: number; sick: number; annual: number; maternity: number; other: number },
    absentDays: number
  ): { personalLeaveDeduction: number; sickLeaveDeduction: number; absentDeduction: number; total: number } {
    const dailyRate = this.calculateDailyRate(baseSalary);
    const personalLeaveDeduction = leaveDays.personal * dailyRate;
    const sickLeaveDeduction = leaveDays.sick * dailyRate * 0.5;
    const absentDeduction = absentDays * dailyRate * 2;

    return {
      personalLeaveDeduction: Math.round(personalLeaveDeduction * 100) / 100,
      sickLeaveDeduction: Math.round(sickLeaveDeduction * 100) / 100,
      absentDeduction: Math.round(absentDeduction * 100) / 100,
      total: Math.round((personalLeaveDeduction + sickLeaveDeduction + absentDeduction) * 100) / 100,
    };
  }

  calculatePerformanceBonus(
    baseSalary: number,
    performance: PerformanceRecord | undefined
  ): { items: EarningItem[]; total: number } {
    const items: EarningItem[] = [];
    let total = 0;

    if (performance) {
      const bonusRate = PERFORMANCE_BONUS_RATES[performance.level] || 0;
      const monthlyBonus = performance.bonus > 0 ? performance.bonus : baseSalary * bonusRate;
      total = monthlyBonus;

      items.push({
        id: `performance_bonus_${Date.now()}`,
        name: '绩效奖金',
        type: 'bonus',
        amount: Math.round(total * 100) / 100,
        description: `绩效等级: ${performance.level}, 得分: ${performance.score}`,
      });
    }

    return { items, total: Math.round(total * 100) / 100 };
  }

  calculateSalesCommission(
    salesCommission: SalesCommission | undefined
  ): { items: EarningItem[]; total: number } {
    const items: EarningItem[] = [];
    let total = 0;

    if (salesCommission && salesCommission.commissionAmount > 0) {
      total = salesCommission.commissionAmount;
      items.push({
        id: `sales_commission_${Date.now()}`,
        name: '销售提成',
        type: 'commission',
        amount: Math.round(total * 100) / 100,
        description: `销售额: ${salesCommission.salesAmount}, 提成率: ${(salesCommission.commissionRate * 100).toFixed(2)}%`,
      });
    }

    return { items, total: Math.round(total * 100) / 100 };
  }

  calculateAllowances(employee: Employee): { items: EarningItem[]; total: number } {
    const items: EarningItem[] = [];
    let total = 0;

    const mealAllowance = 500;
    items.push({
      id: `meal_allowance_${Date.now()}`,
      name: '餐补',
      type: 'allowance',
      amount: mealAllowance,
      description: '月度餐补',
    });
    total += mealAllowance;

    const transportAllowance = 300;
    items.push({
      id: `transport_allowance_${Date.now()}`,
      name: '交通补贴',
      type: 'allowance',
      amount: transportAllowance,
      description: '月度交通补贴',
    });
    total += transportAllowance;

    return { items, total: Math.round(total * 100) / 100 };
  }

  calculateGrossSalary(
    employee: Employee,
    attendance: AttendanceRecord | undefined,
    performance: PerformanceRecord | undefined,
    salesCommission: SalesCommission | undefined
  ): {
    baseSalary: EarningItem;
    overtimeItems: EarningItem[];
    performanceItems: EarningItem[];
    salesItems: EarningItem[];
    allowanceItems: EarningItem[];
    allEarnings: EarningItem[];
    totalOvertime: number;
    totalPerformance: number;
    totalSales: number;
    totalAllowances: number;
    leaveDeductionAmount: number;
    grossSalary: number;
  } {
    logger.info(`Calculating gross salary for employee ${employee.id}`);

    const baseSalary: EarningItem = {
      id: `base_salary_${Date.now()}`,
      name: '基本工资',
      type: 'base_salary',
      amount: employee.baseSalary,
      description: '月度基本工资',
    };

    const { items: overtimeItems, total: totalOvertime } = this.calculateOvertimePay(
      employee.baseSalary,
      attendance?.overtimeHours || { weekday: 0, weekend: 0, holiday: 0 }
    );

    const { items: performanceItems, total: totalPerformance } = this.calculatePerformanceBonus(
      employee.baseSalary,
      performance
    );

    const { items: salesItems, total: totalSales } = this.calculateSalesCommission(salesCommission);

    const { items: allowanceItems, total: totalAllowances } = this.calculateAllowances(employee);

    const { total: leaveDeductionAmount } = this.calculateLeaveDeduction(
      employee.baseSalary,
      attendance?.leaveDays || { personal: 0, sick: 0, annual: 0, maternity: 0, other: 0 },
      attendance?.absentDays || 0
    );

    const grossSalary =
      employee.baseSalary +
      totalOvertime +
      totalPerformance +
      totalSales +
      totalAllowances -
      leaveDeductionAmount;

    const allEarnings = [baseSalary, ...overtimeItems, ...performanceItems, ...salesItems, ...allowanceItems];

    logger.info(
      `Gross salary calculated for employee ${employee.id}: ${grossSalary.toFixed(2)}`
    );

    return {
      baseSalary,
      overtimeItems,
      performanceItems,
      salesItems,
      allowanceItems,
      allEarnings,
      totalOvertime,
      totalPerformance,
      totalSales,
      totalAllowances,
      leaveDeductionAmount,
      grossSalary: Math.round(grossSalary * 100) / 100,
    };
  }
}

export const salaryCalculator = new SalaryCalculator();
