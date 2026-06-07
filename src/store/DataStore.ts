import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Employee,
  Department,
  AttendanceRecord,
  PerformanceRecord,
  SalesCommission,
  PayrollRecord,
  DepartmentPayrollSummary,
  BankPaymentRecord,
  Payslip,
  AuditLog,
  DeductionChangeRequest,
} from '../types';
import { config } from '../config';

class DataStore {
  private dataDir: string;
  private cache: Map<string, any> = new Map();

  constructor() {
    this.dataDir = config.paths.dataDir;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'employees'),
      path.join(this.dataDir, 'departments'),
      path.join(this.dataDir, 'attendance'),
      path.join(this.dataDir, 'performance'),
      path.join(this.dataDir, 'sales'),
      path.join(this.dataDir, 'payroll'),
      path.join(this.dataDir, 'approvals'),
      path.join(this.dataDir, 'bank'),
      path.join(this.dataDir, 'payslips'),
      path.join(this.dataDir, 'logs'),
      path.join(this.dataDir, 'requests'),
      config.paths.exportsDir,
      config.paths.logsDir,
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private getFilePath(category: string, fileName: string): string {
    return path.join(this.dataDir, category, fileName);
  }

  private readJson<T>(filePath: string): T | null {
    if (config.performance.enableCache && this.cache.has(filePath)) {
      return this.cache.get(filePath) as T;
    }

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      if (config.performance.enableCache) {
        this.cache.set(filePath, data);
      }
      return data as T;
    } catch {
      return null;
    }
  }

  private writeJson<T>(filePath: string, data: T): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    if (config.performance.enableCache) {
      this.cache.set(filePath, data);
    }
  }

  private readAllInDirectory<T>(category: string): T[] {
    const dir = path.join(this.dataDir, category);
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files
      .map((f) => this.readJson<T>(path.join(dir, f)))
      .filter((d): d is T => d !== null);
  }

  generateId(): string {
    return uuidv4();
  }

  saveEmployee(employee: Employee): void {
    this.writeJson(this.getFilePath('employees', `${employee.id}.json`), employee);
  }

  getEmployee(id: string): Employee | null {
    return this.readJson<Employee>(this.getFilePath('employees', `${id}.json`));
  }

  getEmployeeByNo(employeeNo: string): Employee | null {
    const employees = this.getAllEmployees();
    return employees.find((e) => e.employeeNo === employeeNo) || null;
  }

  getAllEmployees(): Employee[] {
    return this.readAllInDirectory<Employee>('employees');
  }

  getActiveEmployees(): Employee[] {
    return this.getAllEmployees().filter((e) => e.status === 'active');
  }

  getEmployeesByDepartment(departmentId: string): Employee[] {
    return this.getActiveEmployees().filter((e) => e.departmentId === departmentId);
  }

  saveDepartment(department: Department): void {
    this.writeJson(this.getFilePath('departments', `${department.id}.json`), department);
  }

  getDepartment(id: string): Department | null {
    return this.readJson<Department>(this.getFilePath('departments', `${id}.json`));
  }

  getAllDepartments(): Department[] {
    return this.readAllInDirectory<Department>('departments');
  }

  saveAttendance(record: AttendanceRecord): void {
    this.writeJson(
      this.getFilePath('attendance', `${record.employeeId}_${record.year}_${record.month}.json`),
      record
    );
  }

  getAttendance(employeeId: string, year: number, month: number): AttendanceRecord | null {
    return this.readJson<AttendanceRecord>(
      this.getFilePath('attendance', `${employeeId}_${year}_${month}.json`)
    );
  }

  getAttendanceByMonth(year: number, month: number): AttendanceRecord[] {
    const all = this.readAllInDirectory<AttendanceRecord>('attendance');
    return all.filter((a) => a.year === year && a.month === month);
  }

  savePerformance(record: PerformanceRecord): void {
    this.writeJson(
      this.getFilePath('performance', `${record.employeeId}_${record.year}_${record.month}.json`),
      record
    );
  }

  getPerformance(employeeId: string, year: number, month: number): PerformanceRecord | null {
    return this.readJson<PerformanceRecord>(
      this.getFilePath('performance', `${employeeId}_${year}_${month}.json`)
    );
  }

  getPerformanceByMonth(year: number, month: number): PerformanceRecord[] {
    const all = this.readAllInDirectory<PerformanceRecord>('performance');
    return all.filter((p) => p.year === year && p.month === month);
  }

  saveSalesCommission(record: SalesCommission): void {
    this.writeJson(
      this.getFilePath('sales', `${record.employeeId}_${record.year}_${record.month}.json`),
      record
    );
  }

  getSalesCommission(employeeId: string, year: number, month: number): SalesCommission | null {
    return this.readJson<SalesCommission>(
      this.getFilePath('sales', `${employeeId}_${year}_${month}.json`)
    );
  }

  getSalesCommissionByMonth(year: number, month: number): SalesCommission[] {
    const all = this.readAllInDirectory<SalesCommission>('sales');
    return all.filter((s) => s.year === year && s.month === month);
  }

  savePayrollRecord(record: PayrollRecord): void {
    this.writeJson(
      this.getFilePath('payroll', `${record.employeeId}_${record.year}_${record.month}.json`),
      record
    );
  }

  getPayrollRecord(employeeId: string, year: number, month: number): PayrollRecord | null {
    return this.readJson<PayrollRecord>(
      this.getFilePath('payroll', `${employeeId}_${year}_${month}.json`)
    );
  }

  getPayrollByMonth(year: number, month: number): PayrollRecord[] {
    const all = this.readAllInDirectory<PayrollRecord>('payroll');
    return all.filter((p) => p.year === year && p.month === month);
  }

  getPayrollByEmployee(employeeId: string): PayrollRecord[] {
    const all = this.readAllInDirectory<PayrollRecord>('payroll');
    return all.filter((p) => p.employeeId === employeeId).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  getPayrollByDepartment(departmentId: string, year: number, month: number): PayrollRecord[] {
    const employees = this.getEmployeesByDepartment(departmentId);
    const employeeIds = new Set(employees.map((e) => e.id));
    const all = this.getPayrollByMonth(year, month);
    return all.filter((p) => employeeIds.has(p.employeeId));
  }

  saveDepartmentSummary(summary: DepartmentPayrollSummary): void {
    this.writeJson(
      this.getFilePath('payroll', `dept_${summary.departmentId}_${summary.year}_${summary.month}.json`),
      summary
    );
  }

  getDepartmentSummary(departmentId: string, year: number, month: number): DepartmentPayrollSummary | null {
    return this.readJson<DepartmentPayrollSummary>(
      this.getFilePath('payroll', `dept_${departmentId}_${year}_${month}.json`)
    );
  }

  saveBankPayment(record: BankPaymentRecord): void {
    this.writeJson(this.getFilePath('bank', `${record.id}.json`), record);
  }

  getBankPayment(id: string): BankPaymentRecord | null {
    return this.readJson<BankPaymentRecord>(this.getFilePath('bank', `${id}.json`));
  }

  getBankPaymentsByBatch(batchId: string): BankPaymentRecord[] {
    const all = this.readAllInDirectory<BankPaymentRecord>('bank');
    return all.filter((b) => b.batchId === batchId);
  }

  savePayslip(payslip: Payslip): void {
    this.writeJson(this.getFilePath('payslips', `${payslip.id}.json`), payslip);
  }

  getPayslip(id: string): Payslip | null {
    return this.readJson<Payslip>(this.getFilePath('payslips', `${id}.json`));
  }

  getPayslipsByMonth(year: number, month: number): Payslip[] {
    const all = this.readAllInDirectory<Payslip>('payslips');
    return all.filter((p) => p.year === year && p.month === month);
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const auditLog: AuditLog = {
      ...log,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };
    const allLogs = this.readAllInDirectory<AuditLog>('logs');
    allLogs.push(auditLog);
    this.writeJson(path.join(this.dataDir, 'logs', 'audit.json'), allLogs);
    return auditLog;
  }

  getAuditLogs(options?: {
    userId?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLog[] {
    let logs = this.readAllInDirectory<AuditLog>('logs');
    if (options?.userId) {
      logs = logs.filter((l) => l.userId === options.userId);
    }
    if (options?.module) {
      logs = logs.filter((l) => l.module === options.module);
    }
    if (options?.startDate) {
      logs = logs.filter((l) => l.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      logs = logs.filter((l) => l.timestamp <= options.endDate!);
    }
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  saveDeductionRequest(request: DeductionChangeRequest): void {
    this.writeJson(this.getFilePath('requests', `${request.id}.json`), request);
  }

  getDeductionRequest(id: string): DeductionChangeRequest | null {
    return this.readJson<DeductionChangeRequest>(this.getFilePath('requests', `${id}.json`));
  }

  getDeductionRequestsByEmployee(employeeId: string): DeductionChangeRequest[] {
    const all = this.readAllInDirectory<DeductionChangeRequest>('requests');
    return all
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  getPendingDeductionRequests(): DeductionChangeRequest[] {
    const all = this.readAllInDirectory<DeductionChangeRequest>('requests');
    return all.filter((r) => r.status === 'pending');
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dataStore = new DataStore();
