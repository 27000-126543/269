import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import {
  Employee,
  Department,
  AttendanceRecord,
  PerformanceRecord,
  SalesCommission,
} from '../types';

const logger = createModuleLogger('SampleDataGenerator');

const CITIES = ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hangzhou', 'chengdu'];
const DEPARTMENTS = [
  { name: '技术研发部', budget: 800000 },
  { name: '产品部', budget: 300000 },
  { name: '市场部', budget: 500000 },
  { name: '销售部', budget: 600000 },
  { name: '人力资源部', budget: 150000 },
  { name: '财务部', budget: 200000 },
  { name: '运营部', budget: 250000 },
];

const POSITIONS_BY_DEPT: Record<string, string[]> = {
  '技术研发部': ['高级工程师', '工程师', '初级工程师', '技术经理', '架构师'],
  '产品部': ['产品经理', '产品助理', '产品总监'],
  '市场部': ['市场专员', '市场经理', '品牌经理'],
  '销售部': ['销售代表', '销售经理', '销售总监'],
  '人力资源部': ['HR专员', 'HR经理', '招聘专员'],
  '财务部': ['会计', '财务经理', '出纳'],
  '运营部': ['运营专员', '运营经理', '内容运营'],
};

const FIRST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高'];
const LAST_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟'];

export class SampleDataGenerator {
  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number, decimals: number = 2): number {
    return Number((Math.random() * (max - min) + min).toFixed(decimals));
  }

  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  generateIdCard(): string {
    const areaCode = '110101';
    const year = this.random(1980, 2000);
    const month = String(this.random(1, 12)).padStart(2, '0');
    const day = String(this.random(1, 28)).padStart(2, '0');
    const sequence = String(this.random(100, 999));
    const checkCode = String(this.random(0, 9));
    return `${areaCode}${year}${month}${day}${sequence}${checkCode}`;
  }

  generatePhone(): string {
    const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188'];
    return this.randomPick(prefixes) + String(this.random(10000000, 99999999));
  }

  generateBankAccount(): string {
    return '6222' + String(this.random(100000000000, 999999999999));
  }

  generateName(): string {
    return this.randomPick(FIRST_NAMES) + this.randomPick(LAST_NAMES);
  }

  async generateDepartments(): Promise<Department[]> {
    logger.info('Generating sample departments');
    const departments: Department[] = [];

    for (let i = 0; i < DEPARTMENTS.length; i++) {
      const dept: Department = {
        id: dataStore.generateId(),
        name: DEPARTMENTS[i].name,
        budget: DEPARTMENTS[i].budget,
        level: 1,
      };
      departments.push(dept);
      dataStore.saveDepartment(dept);
    }

    return departments;
  }

  async generateEmployees(count: number): Promise<Employee[]> {
    logger.info(`Generating ${count} sample employees`);
    const departments = dataStore.getAllDepartments();
    const employees: Employee[] = [];

    for (let i = 0; i < count; i++) {
      const dept = this.randomPick(departments);
      const positions = POSITIONS_BY_DEPT[dept.name] || ['员工'];
      const position = this.randomPick(positions);
      const city = this.randomPick(CITIES);

      let baseSalary = 8000;
      if (position.includes('总监') || position.includes('架构师')) {
        baseSalary = this.random(35000, 50000);
      } else if (position.includes('经理')) {
        baseSalary = this.random(20000, 35000);
      } else if (position.includes('高级')) {
        baseSalary = this.random(18000, 28000);
      } else if (position.includes('工程师')) {
        baseSalary = this.random(12000, 20000);
      } else if (position.includes('助理') || position.includes('专员') || position.includes('代表')) {
        baseSalary = this.random(6000, 10000);
      } else {
        baseSalary = this.random(8000, 15000);
      }

      const ssBase = Math.round(baseSalary * this.randomFloat(0.8, 1.0));
      const hfBase = ssBase;
      const hfRatio = this.randomFloat(0.05, 0.12, 4);

      const employee: Employee = {
        id: dataStore.generateId(),
        employeeNo: `EMP${String(i + 1).padStart(5, '0')}`,
        name: this.generateName(),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        idCard: this.generateIdCard(),
        phone: this.generatePhone(),
        email: `emp${i + 1}@company.com`,
        departmentId: dept.id,
        position,
        hireDate: new Date(2018 + this.random(0, 5), this.random(0, 11), this.random(1, 28)).toISOString(),
        baseSalary,
        bankAccount: this.generateBankAccount(),
        bankName: '中国工商银行',
        socialSecurityCity: city,
        housingFundCity: city,
        socialSecurityBase: ssBase,
        housingFundBase: hfBase,
        housingFundRatio: hfRatio,
        isTaxResident: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      employees.push(employee);
      dataStore.saveEmployee(employee);
    }

    return employees;
  }

  async generateAttendanceData(year: number, month: number): Promise<AttendanceRecord[]> {
    logger.info(`Generating attendance data for ${year}-${month}`);
    const employees = dataStore.getActiveEmployees();
    const records: AttendanceRecord[] = [];

    for (const emp of employees) {
      const standardDays = 22;
      const workDays = standardDays - this.random(0, 2);

      const record: AttendanceRecord = {
        id: dataStore.generateId(),
        employeeId: emp.id,
        year,
        month,
        workDays,
        standardWorkDays: standardDays,
        overtimeHours: {
          weekday: this.random(0, 20),
          weekend: this.random(0, 8),
          holiday: 0,
        },
        leaveDays: {
          personal: this.random(0, 1),
          sick: this.random(0, 1),
          annual: this.random(0, 2),
          maternity: 0,
          other: 0,
        },
        lateCount: this.random(0, 3),
        earlyLeaveCount: this.random(0, 2),
        absentDays: this.random(0, 1),
      };

      records.push(record);
      dataStore.saveAttendance(record);
    }

    return records;
  }

  async generatePerformanceData(year: number, month: number): Promise<PerformanceRecord[]> {
    logger.info(`Generating performance data for ${year}-${month}`);
    const employees = dataStore.getActiveEmployees();
    const records: PerformanceRecord[] = [];

    for (const emp of employees) {
      const levels: Array<'S' | 'A' | 'B' | 'C' | 'D'> = ['S', 'A', 'B', 'C', 'D'];
      const weights = [0.1, 0.2, 0.4, 0.2, 0.1];
      let rand = Math.random();
      let level: 'S' | 'A' | 'B' | 'C' | 'D' = 'B';
      let cumulative = 0;
      for (let i = 0; i < levels.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
          level = levels[i];
          break;
        }
      }

      const scoreMap = { S: 95, A: 85, B: 75, C: 65, D: 50 };
      const score = scoreMap[level] + this.random(-5, 5);
      const bonus = level === 'S' ? emp.baseSalary * 0.3 :
                    level === 'A' ? emp.baseSalary * 0.2 :
                    level === 'B' ? emp.baseSalary * 0.1 :
                    level === 'C' ? emp.baseSalary * 0.05 : 0;

      const record: PerformanceRecord = {
        id: dataStore.generateId(),
        employeeId: emp.id,
        year,
        month,
        score: Math.max(0, Math.min(100, score)),
        level,
        bonus: Math.round(bonus * 100) / 100,
        comments: `月度绩效评估 - ${level}级`,
      };

      records.push(record);
      dataStore.savePerformance(record);
    }

    return records;
  }

  async generateSalesCommission(year: number, month: number): Promise<SalesCommission[]> {
    logger.info(`Generating sales commission data for ${year}-${month}`);
    const employees = dataStore.getActiveEmployees();
    const salesEmployees = employees.filter((e) => e.position.includes('销售'));
    const records: SalesCommission[] = [];

    for (const emp of salesEmployees) {
      const salesAmount = this.randomFloat(100000, 500000);
      const commissionRate = this.randomFloat(0.02, 0.05, 4);
      const commissionAmount = Math.round(salesAmount * commissionRate * 100) / 100;

      const record: SalesCommission = {
        id: dataStore.generateId(),
        employeeId: emp.id,
        year,
        month,
        salesAmount: Math.round(salesAmount * 100) / 100,
        commissionRate,
        commissionAmount,
        orderIds: ['ORD' + this.random(10000, 99999)],
      };

      records.push(record);
      dataStore.saveSalesCommission(record);
    }

    return records;
  }

  async generateAllSampleData(employeeCount: number, year: number, month: number): Promise<void> {
    logger.info(`Generating all sample data for ${employeeCount} employees, ${year}-${month}`);

    await this.generateDepartments();
    await this.generateEmployees(employeeCount);
    await this.generateAttendanceData(year, month);
    await this.generatePerformanceData(year, month);
    await this.generateSalesCommission(year, month);

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'generate_sample_data',
      module: 'sample_data',
      details: { employeeCount, year, month },
    });

    logger.info('Sample data generation completed');
  }
}

export const sampleDataGenerator = new SampleDataGenerator();
